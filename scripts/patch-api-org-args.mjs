import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const apiDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app", "api");

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name === "route.ts") files.push(p);
  }
  return files;
}

for (const file of walk(apiDir)) {
  let src = fs.readFileSync(file, "utf8");
  const orig = src;

  src = src.replace(/ensureDefaultFolders\(\)/g, "ensureDefaultFolders(orgId)");
  src = src.replace(
    /resolveAhuDatasetFileId\(([^,]+),\s*("(?:materials|profiles|components)")\)/g,
    "resolveAhuDatasetFileId($1, $2, orgId)"
  );
  src = src.replace(
    /resolveAhuDatasetFileId\(\s*String\([^)]+\),\s*("(?:materials|profiles|components)")\s*\)/g,
    (m) => m.replace(/\)$/, ", orgId)")
  );

  if (src !== orig) {
    fs.writeFileSync(file, src);
    console.log("fixed", path.relative(apiDir, file));
  }
}
