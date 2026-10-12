// Verifies WCAG contrast for the dotmatrix palette blocks in app/globals.css.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function block(selector) {
  const i = css.indexOf(selector + " {");
  if (i < 0) throw new Error(`missing block ${selector}`);
  const body = css.slice(css.indexOf("{", i) + 1, css.indexOf("}", i));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
  );
}

function oklchToRgb(str) {
  const m = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error(`cannot parse ${str}`);
  const [L, C, h] = [+m[1], +m[2], (+m[3] * Math.PI) / 180];
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)));
}

const lum = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
function ratio(a, b) {
  const [x, y] = [lum(oklchToRgb(a)), lum(oklchToRgb(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const PAIRS = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["muted-foreground", "card"],
  ["muted-foreground", "background"],
  ["signal", "card"],
  ["positive", "card"],
  ["primary-foreground", "primary"],
  ["inverse-foreground", "inverse"],
];

let failed = false;
for (const [name, selector] of [
  ["light", 'html[data-palette="dotmatrix"]'],
  ["dark", 'html.dark[data-palette="dotmatrix"]'],
]) {
  const vars = block(selector);
  for (const [fg, bg] of PAIRS) {
    const r = ratio(vars[fg], vars[bg]);
    const ok = r >= 4.5;
    if (!ok) failed = true;
    console.log(`${ok ? "ok  " : "FAIL"} ${name} ${fg} on ${bg}: ${r.toFixed(2)}`);
  }
}
process.exit(failed ? 1 : 0);
