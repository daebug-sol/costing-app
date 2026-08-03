/**
 * Conditional predev: skip prisma generate + Turbopack Prisma cache clear
 * when prisma/schema.prisma is unchanged since last generate.
 *
 * Hash file lives under node_modules/ so it is wiped on npm install
 * (postinstall already runs prisma generate).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "prisma", "schema.prisma");
const hashPath = join(root, "node_modules", ".prisma-schema-hash");

const schema = readFileSync(schemaPath);
const hash = createHash("sha256").update(schema).digest("hex");

let stored = null;
if (existsSync(hashPath)) {
  stored = readFileSync(hashPath, "utf8").trim();
}

if (stored === hash) {
  console.log("schema unchanged — skipping");
  process.exit(0);
}

execSync("npx prisma generate", { cwd: root, stdio: "inherit" });

const cacheDirs = [
  join(root, ".next", "dev", "node_modules", "@prisma"),
  join(root, ".next", "node_modules", "@prisma"),
  join(root, ".next", "dev", "node_modules", ".prisma"),
  join(root, ".next", "node_modules", ".prisma"),
];

for (const dir of cacheDirs) {
  if (!existsSync(dir)) continue;
  rmSync(dir, { recursive: true, force: true });
  console.log(`cleared ${dir}`);
}

mkdirSync(dirname(hashPath), { recursive: true });
writeFileSync(hashPath, hash + "\n", "utf8");
