/**
 * Turbopack vendors @prisma/client under .next node_modules.
 * After prisma generate, that copy can stay stale (Unknown argument on new fields).
 * Clear it on every predev so Next picks up the freshly generated client.
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const roots = [
  join(".next", "dev", "node_modules", "@prisma"),
  join(".next", "node_modules", "@prisma"),
  join(".next", "dev", "node_modules", ".prisma"),
  join(".next", "node_modules", ".prisma"),
];

for (const dir of roots) {
  if (!existsSync(dir)) continue;
  rmSync(dir, { recursive: true, force: true });
  console.log(`cleared ${dir}`);
}
