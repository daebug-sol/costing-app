---
paths:
  - "components/**/*.tsx"
  - "app/**/*.tsx"
---

# UI

Full standard: `docs/UI-HARNESS.md`; gate: `docs/UI-PR-CHECKLIST.md`; copy: `docs/UI-COPY-GUIDE.md`.

- Reuse `components/ui/*` (add via the `shadcn` skill). No raw `<button>/<input>/<textarea>/<table>/<label>` — use `Button`, `Input`, `Textarea`, `Table`, `Label`.
- Semantic tokens only (`bg-card`, `text-muted-foreground`, `border-border`); no hex, no `bg-white`, no arbitrary `text-[Npx]`. Status tones: emerald / amber / rose only.
- Icons: lucide-react only. Icon-only buttons need `aria-label` naming the target.
- Destructive actions: `AlertDialog` naming the object. Never `window.confirm`/`prompt`.
- One `<h1>` per page (`PageHeader`/`PageShell`); shell max-width 1400px.
- Every async view has loading (skeleton), empty (`EmptyState`) and error states; toasts via the global `toastStore`.
- Strings go through `lib/i18n/`; no hardcoded English/Indonesian in JSX.
- No gradients/blur/glow decoration. UI tasks never touch calculation code.
