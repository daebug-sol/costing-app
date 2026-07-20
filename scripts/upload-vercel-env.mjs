import { spawnSync } from "child_process";
import fs from "fs";

const lines = fs.readFileSync(".env.vercel", "utf8").split(/\r?\n/).filter(Boolean);

for (const line of lines) {
  const i = line.indexOf("=");
  const key = line.slice(0, i);
  let val = line.slice(i + 1);
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }

  for (const env of ["production", "preview", "development"]) {
    const r = spawnSync(
      "npx",
      ["vercel@latest", "env", "add", key, env, "--force", "--yes"],
      {
        input: val + "\n",
        encoding: "utf8",
        shell: true,
      }
    );
    const out = `${r.stdout || ""}${r.stderr || ""}`;
    const tail = out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(-2)
      .join(" | ");
    console.log(`${key} [${env}] exit=${r.status} ${tail}`);
  }
}
