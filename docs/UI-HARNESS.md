# UI / UX harness — costing-app

This document is the **central UI/UX harness** for `costing-app`. It is the
counterpart to `docs/PRODUCTION-HARNESS.md` (which covers infra/SaaS): here we
codify the **product surface** — design system reuse, interaction feedback,
accessibility, copy, and the gates a UI change must clear before merge.

It complements:

| Resource | Role |
|----------|------|
| `.cursor/rules/costing-ui.mdc` | Always-on UI guardrails for agents (shadcn, Tailwind tokens, density). |
| `docs/UI-PR-CHECKLIST.md` | Per-PR quality gates a reviewer can tick through. |
| `docs/UX-ACCEPTANCE-SCENARIOS.md` | Task-based acceptance flows (Costing, Database, Dashboard, Quotation). |
| `docs/UI-COPY-GUIDE.md` | Bilingual copy rules (Indonesian primary, English fallback). |
| `playwright.config.ts` + `tests/ui/*` | Visual regression + smoke harness. |

> **Scope discipline (from `.cursor/rules/costing-app-core.mdc`):** UI tasks
> must not change calculation logic in `lib/calculations/*`,
> `lib/ahu-segment-costing.ts`, or `lib/project-rollup.ts` unless the task
> *explicitly* asks for both. Drive-by restyling of unrelated screens is also
> out of scope.

---

## 1. Design system & primitives

The repo already ships a single design system. Do **not** introduce a second
one (e.g. MUI, Chakra, Mantine, raw HTML buttons).

| Surface | Use these |
|---------|-----------|
| Buttons, Inputs, Cards, Tables, Tabs, Dialog, Tooltip, Select, Switch | `components/ui/*` (shadcn-style on Radix) |
| Layout chrome | `components/Navbar.tsx`, `app/layout.tsx` |
| Empty / loading | `components/empty-state.tsx`, `components/table-loading-skeleton.tsx`, `components/ui/skeleton.tsx` |
| Toast / inline status | `components/Toast.tsx` + `store/toastStore.ts` |
| Icons | `lucide-react` only |
| Money / number formatting | `lib/utils/format.ts` (`formatIDR`, `formatPercent`, `tabular-money` class) |

**Tokens (Tailwind v4 theme):** prefer semantic tokens — `bg-card`,
`bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`,
`text-primary`. Avoid one-off hex colors except for tone accents already in
use (`emerald-*` for positive, `amber-*` for warning, `rose-*` / `red-*` for
negative). New tones should be added to `app/globals.css` first.

**Density:** match neighboring screens. The dashboard, costing workspace, and
database module all use the `mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8`
shell with `space-y-6`. Card padding is `p-3`–`p-4` and headings are
`text-2xl font-semibold tracking-tight` (page) / `text-base` (card). Do not
introduce a new scale.

---

## 2. Interaction & feedback policy

Every async user action must visibly enter and exit one of these states.
"No feedback" is a bug.

### 2.1 State matrix

| State | Required treatment |
|-------|-------------------|
| **Idle** | Default control style. Affordance for the primary action is obvious (filled `Button`, no ambiguity). |
| **Pending** | Disable the trigger (`disabled` + `aria-busy="true"`). Show inline spinner *or* skeleton in the destination region — never both. Never freeze the page without indication for >150 ms. |
| **Success** | Either (a) the data updates in place (preferred for inline edits), or (b) a `success` toast via `useToastStore.success()` for non-local actions (save, export, delete). Do not toast *and* navigate without warning. |
| **Validation error** | Surface inline next to the field with `text-rose-600 text-xs`. Do not toast for field-level validation. |
| **API / unexpected error** | `useToastStore.error()` with a human Indonesian message. Keep the user's input. Provide a "Coba lagi" button when the action is retryable (see `DashboardPage` retry pattern). |
| **Empty** | Use `<EmptyState>` with an icon, one-line title, optional description, and a primary action that *unblocks* the user (e.g. "Buka Costing"). |
| **Loading list/table** | `<TableLoadingSkeleton>` or `<Skeleton>` rows with the same column count as the loaded view. Do not collapse layout height during load (causes scroll jump). |

### 2.2 Latency budgets

| Action | Target | Hard ceiling |
|--------|--------|--------------|
| Open page (dashboard, costing) to first meaningful paint | < 600 ms | 1.5 s |
| Inline cell edit (recalculate) | < 250 ms | 800 ms |
| Save / persist project | < 800 ms | 2 s |
| Excel/PDF export | < 3 s | 8 s — show progress toast and disable trigger |

If an action can exceed 800 ms, it **must** show a pending indicator within
150 ms.

### 2.3 Destructive actions

- Always use `Dialog` for confirm; never `window.confirm()`.
- The destructive button uses `Button variant="destructive"` and is on the
  right (per `Dialog` convention in this repo).
- Confirmation copy names the object: *"Hapus segment 'AHU-01 Cooling'?"*,
  not *"Anda yakin?"*.
- After delete, focus returns to the row's previous-sibling control or the
  list's "add" button.

---

## 3. Accessibility checklist

Costing-app targets **WCAG 2.1 AA** for screens accessed during day-to-day
use (Dashboard, Costing, Database, Documentation, Settings).

### 3.1 Per-screen quick check

- [ ] **Page has exactly one `<h1>`** matching the route's name.
- [ ] **Tab order** follows visual order; no `tabIndex > 0`.
- [ ] **Focus ring** is visible on every interactive element (do not strip
      Tailwind's `focus-visible:` utilities from `components/ui/*`).
- [ ] **Color is never the only signal.** Positive/negative numbers also use
      `+`/`-`, an icon, or text ("Net …").
- [ ] **Contrast** ≥ 4.5:1 for body text, ≥ 3:1 for large text and graphics.
      Tokens in `globals.css` are vetted; verify any new tone.
- [ ] **Forms:** every `<Input>` / `<Select>` has a paired `<Label>` (the
      shadcn `Label` component, not a bare `<label>` to keep styling).
- [ ] **Buttons** have either visible text or an `aria-label` (icon-only
      buttons must always have one — see `Toast.tsx` "Dismiss").
- [ ] **Dialogs** have a title and the focus trap is intact (Radix default —
      do not override `onOpenAutoFocus` without reason).
- [ ] **Live regions:** the toaster region uses `role="region"
      aria-label="Notifications"` and each toast `role="alert"`. Keep this
      pattern for new transient announcements.
- [ ] **Keyboard-only smoke:** every primary task can be completed without a
      mouse (see `UX-ACCEPTANCE-SCENARIOS.md`).
- [ ] **Reduced motion:** any new animation respects
      `@media (prefers-reduced-motion: reduce)` (Tailwind utility:
      `motion-reduce:transition-none`).

### 3.2 What to avoid

- `div`/`span` with `onClick` and no role/keyboard handling. Use `Button` or
  add `role="button"` + key handlers (rare — prefer `Button`).
- Placeholders as labels.
- Truncation that hides actionable info without a tooltip
  (`components/ui/tooltip.tsx`).
- Auto-playing or auto-focusing content that scrolls the user.

---

## 4. Visual regression harness (Playwright)

Visual regressions are guarded by Playwright at `tests/ui/*.visual.spec.ts`,
configured by `playwright.config.ts`. The harness is opt-in: it is **not**
part of `npm test` (Jest) and does **not** run in `npm run build`.

### 4.1 First-time setup (one-off, per machine)

```bash
npm install
npx playwright install chromium
```

### 4.2 Day-to-day

```bash
npm run ui:test           # run all UI specs against the dev server
npm run ui:test:headed    # same, with a visible browser (debug)
npm run ui:test:update    # update baseline screenshots (after intentional UI change)
npm run ui:test:report    # open the HTML report from the last run
```

The config auto-starts `next dev` on port `3100` locally (separate from the
dev server on `3000`) so it does not conflict with a running editor session.
In CI it switches to `next build && next start` for more stable visual output.
Baselines live next to the spec under
`tests/ui/__screenshots__/<spec>/<name>-<project>.png` and **are committed**.

### 4.3 Authoring rules

- One **task** per spec file, named `<flow>.visual.spec.ts`.
- Use `data-testid` for hooks the test relies on; do not couple tests to
  Tailwind class names.
- Mask volatile regions (timestamps, random IDs, charts that depend on
  live data) with `mask: [page.locator('[data-volatile]')]`.
- Wait for `networkidle` *and* a domain-specific signal (e.g. a known
  element) before snapshotting.
- Keep viewport sizes in `playwright.config.ts` — do not hard-code per spec.

### 4.4 What to test (and what not to)

| Test it | Skip it |
|---------|---------|
| Dashboard hero layout, KPI grid empty state, costing workspace skeleton, quotation export preview shell. | Pixel-perfect chart internals (Sankey curves), font hinting differences across OSes, transient toasts. |

If a baseline diff is intentional, run `npm run ui:test:update`, eyeball the
diff in `playwright-report/`, and commit the new PNGs.

---

## 5. PR gates

A UI PR ships only when **all** of the following are true. The full list,
formatted for the PR body, lives in `docs/UI-PR-CHECKLIST.md`.

1. `npm run lint` has no **new** warnings/errors in touched files (legacy debt
   is tracked separately until paid down).
2. `npm test` passes.
3. `npm run ui:test` passes (or, if intentional baseline change, the new
   PNGs are committed and called out in the PR description).
4. The change uses existing primitives in `components/ui/*` (no new design
   system, no second toast/dialog implementation).
5. The accessibility checklist (§3.1) was walked through for every changed
   screen.
6. Every new async action implements the full state matrix (§2.1).
7. Copy follows `docs/UI-COPY-GUIDE.md` (Indonesian primary, sentence case,
   no all-caps shouting).
8. No calculation logic was touched — or, if it was, the
   `costing-formula-change` skill was followed.

---

## 6. Files this harness touches

```
docs/
  UI-HARNESS.md               <- this file
  UI-PR-CHECKLIST.md          <- copy/paste into PR descriptions
  UI-COPY-GUIDE.md            <- bilingual copy rules
  UX-ACCEPTANCE-SCENARIOS.md  <- task-based acceptance flows
playwright.config.ts          <- Playwright + dev server wiring
tests/ui/
  README.md                   <- how to run / debug
  dashboard.visual.spec.ts    <- sample baseline spec
  __screenshots__/            <- committed baselines (created on first run)
```

---

## 7. Revision

Update this file when:

- A new shared primitive lands in `components/ui/*` or `components/`.
- A latency budget changes (e.g. a flow becomes server-rendered).
- The visual harness changes shape (new project in `playwright.config.ts`,
  new viewport, new mask convention).
- A11y target shifts (e.g. moving from AA to AAA on a specific screen).

Treat this document, together with `PRODUCTION-HARNESS.md`, as the answer to
*"is the UI ready to ship?"* beyond what the linter and unit tests can see.

---

## 8. Transformation cadence (UI-only track)

For large UI/UX transformations, use this three-pass cadence and keep domain
logic untouched:

1. **Foundation pass** — standardize shell, tokens, and core copy patterns.
2. **Flow pass** — improve task flow and state feedback per route.
3. **Polish pass** — close a11y checklist and visual baselines for all
   touched routes.

Every pass ends with `UI-PR-CHECKLIST.md` walkthrough + visual diff review.
