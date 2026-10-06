// Executable UI standard (docs/UI-HARNESS.md + .claude/rules/ui.md). Exit 1 on any FAIL.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const norm = (p) => relative(root, p).split(sep).join("/");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(name)) out.push(full);
  }
  return out;
}

const files = ["app", "components"]
  .filter((d) => existsSync(join(root, d)))
  .flatMap((d) => walk(join(root, d)))
  .map((f) => ({ path: norm(f), text: readFileSync(f, "utf8") }));
const nonUi = files.filter((f) => !f.path.startsWith("components/ui/"));

const results = [];
function rule(name, hits) {
  results.push({ name, hits });
}
function scanLines(list, re, { allow = () => false } = {}) {
  const hits = [];
  for (const f of list) {
    f.text.split(/\r?\n/).forEach((line, i) => {
      if (re.test(line) && !allow(f, line)) hits.push(`${f.path}:${i + 1}`);
    });
  }
  return hits;
}

rule("no window.confirm/prompt/alert", scanLines(files, /window\.(confirm|prompt|alert)\(|(^|[^.\w])confirm\(\s*["'`]/));
rule("no hex colors", scanLines(nonUi, /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?=["'\]\s])/, { allow: (_f, l) => /^\s*(\/\/|\*)/.test(l) || /href=|url\(#|id=/.test(l) }));
rule(
  "no bg-white outside paper/logo previews",
  scanLines(nonUi, /\bbg-white\b/, {
    allow: (f) => f.path.startsWith("components/documentation/documentation-") || f.path === "components/settings/settings-page.tsx",
  })
);
rule("no gradients", scanLines(nonUi, /\bbg-gradient-|\bfrom-[a-z]+-\d/));
rule("no violet/fuchsia/sky tones", scanLines(nonUi, /\b(violet|fuchsia|sky|indigo|purple|pink)-\d{2,3}\b/));
rule("no arbitrary text sizes", scanLines(nonUi, /\btext-\[[0-9.]+(px|rem)\]/));

// icon-only buttons must carry aria-label (JSX-aware: balanced braces/quotes scan of the opening tag)
function openingTags(text, tag) {
  const tags = [];
  const re = new RegExp(`<${tag}\\b`, "g");
  let m;
  while ((m = re.exec(text))) {
    let i = m.index + m[0].length;
    let depth = 0;
    let quote = null;
    for (; i < text.length; i++) {
      const c = text[i];
      if (quote) {
        if (c === quote && text[i - 1] !== "\\") quote = null;
        continue;
      }
      if (depth === 0 && (c === '"' || c === "'")) quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    tags.push({ index: m.index, src: text.slice(m.index, i + 1) });
  }
  return tags;
}
const iconNoLabel = [];
for (const f of nonUi) {
  for (const t of openingTags(f.text, "Button")) {
    if (/size=["{]+\s*["']?icon/.test(t.src) && !/aria-label|aria-labelledby/.test(t.src)) {
      iconNoLabel.push(`${f.path}:${f.text.slice(0, t.index).split("\n").length}`);
    }
  }
}
rule("icon-only Button has aria-label", iconNoLabel);

const rawFields = [];
for (const f of nonUi) {
  for (const tag of ["input", "textarea"]) {
    for (const t of openingTags(f.text, tag)) {
      if (tag === "input" && /type=["'](file|hidden)["']/.test(t.src)) continue;
      rawFields.push(`${f.path}:${f.text.slice(0, t.index).split("\n").length}`);
    }
  }
}
rule("no raw <textarea>/<input> outside ui/ (file/hidden inputs allowed)", rawFields);

rule(
  "no hardcoded English table headers/labels",
  scanLines(nonUi, /<(TableHead|Label|th)\b[^>]*>\s*(Description|Name|Code|Category|Actions|Quantity|Price|Loading\.*|Saving\.*)\s*</)
);
rule("no English loading/saving strings", scanLines(nonUi, /["'>]\s*(Loading|Saving)[^"'<{]*\.\.\.\s*["'<]/));
rule(
  "no local toast duplicating toastStore",
  scanLines(nonUi, /const \[toast, setToast\]|bg-card border-border fixed bottom-4 left-1\/2/)
);

// routes with a data module need error.tsx + loading.tsx
const segments = ["customers", "invoices", "payments", "sales-orders", "costing", "database", "documentation"];
const missing = [];
for (const s of segments) {
  for (const f of ["error.tsx", "loading.tsx"]) {
    if (existsSync(join(root, "app", s)) && !existsSync(join(root, "app", s, f))) missing.push(`app/${s}/${f}`);
  }
}
rule("route segments have error.tsx + loading.tsx", missing);

// Size ratchet: files above MAX_LINES are tolerated only at their recorded size and must never grow.
// Lower a ceiling (or delete the entry) when a file is decomposed. Do not raise them.
const MAX_LINES = Number(process.env.UI_MAX_LINES ?? 1500);
const LEGACY_CEILING = {
};
rule(
  `no component file over ${MAX_LINES} lines (legacy files may not grow)`,
  nonUi
    .map((f) => ({ path: f.path, n: f.text.split("\n").length }))
    .filter(({ path, n }) => n > (LEGACY_CEILING[path] ?? MAX_LINES))
    .map(({ path, n }) => `${path} (${n})`)
);

let failed = 0;
for (const r of results) {
  const ok = r.hits.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${r.name}${ok ? "" : `  (${r.hits.length})`}`);
  if (!ok) r.hits.slice(0, 8).forEach((h) => console.log(`        ${h}`));
}
console.log(failed ? `\n${failed} rule(s) failing` : "\nAll UI standard rules pass");
process.exit(failed ? 1 : 0);
