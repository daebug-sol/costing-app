// Stop: block finishing while typecheck fails. Skips if already continuing from a stop hook or no TS changes.
import { spawnSync } from "node:child_process";

let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  const input = JSON.parse(raw || "{}");
  if (input.stop_hook_active) return;
  const changed = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" }).stdout;
  if (!/\.(tsx?|mjs)\b/.test(changed)) return;
  const r = spawnSync("npm", ["run", "typecheck", "--silent"], { encoding: "utf8", shell: true });
  if (r.status !== 0) {
    console.error("Typecheck failed:\n" + (r.stdout + r.stderr).slice(0, 4000));
    process.exit(2);
  }
});
