---
paths:
  - "components/**/*.tsx"
  - "app/**/*.tsx"
---

# UI

Full standard: `docs/UI-HARNESS.md`; gate: `docs/UI-PR-CHECKLIST.md`; copy: `docs/UI-COPY-GUIDE.md`.

- Reuse `components/ui/*` (add via the `shadcn` skill). Use `Button`, `Input`, `Textarea`, `Table`, `Label` for standard controls. Raw `<button>`/`<label>`/`<table>` are acceptable only for custom composite controls (accordion headers, list-row selectors, menu items, wrapping checkbox labels) that carry their own `aria-*`; `Button`/`Label` force uppercase styling.
- Semantic tokens only (`bg-card`, `text-muted-foreground`, `border-border`); no hex, no `bg-white`, no arbitrary `text-[Npx]`. Status tones: emerald / amber / rose only.
- Icons: lucide-react in app code (Phosphor only inside `components/ui/*`, per the shadcn preset). Icon-only buttons need `aria-label` naming the target.
- Strings: new UI strings go through `lib/i18n/` (`t()`); legacy Indonesian literals are tolerated until a file is migrated.
- Destructive actions: `AlertDialog` naming the object. Never `window.confirm`/`prompt`.
- One `<h1>` per page (`PageHeader`/`PageShell`); shell max-width 1400px.
- Every async view has loading (skeleton), empty (`EmptyState`) and error states; toasts via the global `toastStore`.
- No gradients/blur/glow decoration. UI tasks never touch calculation code.
