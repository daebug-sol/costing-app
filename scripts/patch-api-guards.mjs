/**
 * Adds guardApiRoute() to API route handlers that lack it.
 * Run: node scripts/patch-api-guards.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "app", "api");

const SKIP = new Set([
  path.join(apiDir, "health", "route.ts"),
]);

const GUARD_IMPORT =
  'import { guardApiRoute } from "@/lib/api-guard";\n';
const GUARD_BLOCK = `  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;
`;

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name === "route.ts") files.push(p);
  }
  return files;
}

function patchFile(filePath) {
  if (SKIP.has(filePath)) return false;
  let src = fs.readFileSync(filePath, "utf8");
  if (src.includes("guardApiRoute")) return false;

  if (!src.includes(GUARD_IMPORT.trim())) {
    const lines = src.split("\n");
    let insertAt = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("import ")) insertAt = i + 1;
      else if (insertAt > 0 && !lines[i].startsWith("import ")) break;
    }
    lines.splice(insertAt, 0, GUARD_IMPORT.trim());
    src = lines.join("\n");
  }

  src = src.replace(
    /export async function (GET|POST|PUT|PATCH|DELETE)\([^)]*\)\s*\{/g,
    (match) => `${match}\n${GUARD_BLOCK}`
  );

  fs.writeFileSync(filePath, src);
  return true;
}

const files = walk(apiDir);
let patched = 0;
for (const f of files) {
  if (patchFile(f)) {
    patched++;
    console.log("patched", path.relative(root, f));
  }
}
console.log(`Done. Patched ${patched} files.`);
