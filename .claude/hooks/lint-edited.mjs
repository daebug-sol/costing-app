// PostToolUse: eslint the edited file; feed errors back to Claude (exit 2).
import { spawnSync } from "node:child_process";

let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  const input = JSON.parse(raw || "{}");
  const file = String(input.tool_input?.file_path ?? "");
  if (!/\.(tsx?|mjs|jsx?)$/.test(file) || /node_modules|\.next|\.claude[\\/]/.test(file)) return;
  const r = spawnSync("npx", ["eslint", "--no-warn-ignored", file], {
    encoding: "utf8",
    shell: true,
  });
  if (r.status !== 0) {
    console.error((r.stdout + r.stderr).slice(0, 4000));
    process.exit(2);
  }
});
