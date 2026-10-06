// PreToolUse: block edits to costing math unless ALLOW_CALC_EDIT=1.
let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  const input = JSON.parse(raw || "{}");
  const file = String(input.tool_input?.file_path ?? "").replace(/\\/g, "/");
  const protectedPath = /(^|\/)lib\/(calculations\/|ahu-[^/]+\.ts$|project-rollup\.ts$)/.test(file);
  if (protectedPath && process.env.ALLOW_CALC_EDIT !== "1") {
    console.error(
      "Blocked: costing math is protected. Use the costing-formula-change skill and set ALLOW_CALC_EDIT=1 for deliberate formula work."
    );
    process.exit(2);
  }
});
