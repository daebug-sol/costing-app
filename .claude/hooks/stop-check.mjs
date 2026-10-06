// Stop: block finishing while typecheck or ui:standard fails (skipped when no TS changes).
import { spawnSync } from "node:child_process";

process.stdin.resume();
process.stdin.on("end", () => {
  // No stop_hook_active early return: keep blocking until checks pass (Claude Code caps consecutive blocks).
  const changed = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" }).stdout;
  if (!/\.(tsx?|mjs)\b/.test(changed)) return;
  const r = spawnSync("npm", ["run", "typecheck", "--silent"], { encoding: "utf8", shell: true });
  if (r.status !== 0) {
    console.error("Typecheck failed:\n" + (r.stdout + r.stderr).slice(0, 4000));
    process.exit(2);
  }
  const ui = spawnSync("npm", ["run", "ui:standard", "--silent"], { encoding: "utf8", shell: true });
  if (ui.status !== 0) {
    console.error("UI standard failed:\n" + (ui.stdout + ui.stderr).slice(0, 4000));
    process.exit(2);
  }
});
