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
| Icons | `lucide-react` in app code; `components/ui/*` primitives use Phosphor (the shadcn preset in `components.json`) — do not import Phosphor elsewhere |
| Money / number formatting | `lib/utils/format.ts` (`formatIDR`, `formatPercent`, `tabular-money` class) |

**Tokens (Tailwind v4 theme):** prefer semantic tokens — `bg-card`,
`bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`,
`text-primary`. Avoid one-off hex colors except for tone accents already in
use (`emerald-*` for positive, `amber-*` for warning, `rose-*` / `red-*` for
negative). New tones should be added to `app/globals.css` first.

**Selectable themes:** palette and appearance are independent, device-local
preferences (no DB/API). Users choose **Dot Matrix** (default), **Profesional** (green) or
**Hangat** (legacy taupe) palette, and **Terang**, **Gelap**, or **Sistem**
appearance in Pengaturan → Tampilan. Preferences persist in
`localStorage` key `costing-appearance` as
`{ palette: "dotmatrix"|"professional"|"warm", appearance: "light"|"dark"|"system" }`.
The root `<html>` receives `data-palette` and the `.dark` class (when resolved
appearance is dark). An inline boot script in `app/layout.tsx` applies saved
preferences before first paint; `ThemeProvider` keeps React state, Clerk
shadcn appearance, and system `prefers-color-scheme` in sync. Token sets live
in `app/globals.css` under six combinations (Dot Matrix/Professional/Warm × light/dark).
New users default to **Dot Matrix + System**.

**Dot Matrix palette:** `signal` (red) marks alarms, pointers and negative
numbers; `positive` (green) marks good news; use `text-signal` /
`text-positive` (and `-muted` backgrounds) instead of ad hoc rose/emerald when
writing new Dot Matrix UI. `Card` has three tones: `standard`, `quiet`
(recessed) and `feature` (inverse hero card, at most one per page). Fonts: DM
Sans for text, Doto (`font-dot`) for hero numbers, clock and the wordmark only.
Radius scale follows `--radius` (1rem). No shadows, gradients or blur; the page
canvas dot grid is the `bg-dot-grid` class. Contrast of the palette is checked
by `node scripts/check-theme-contrast.mjs`.

**Navigation:** the main menu is exactly Dashboard, Database, Costing, Dokumentasi (`lib/nav-items.ts`, filtered by permission, plus Operator for operators). Help is a `?` icon button in the top bar's right cluster (also in the account menu); it opens the lesson for the current route (`lessonsForRoute`) or the Help hub. Pages do not add their own "Bantuan" links or empty-state help buttons. Language is chosen only in Pengaturan → Tampilan; the top bar has no language switcher. Below `lg` the main menu is a bottom bar (`components/bottom-nav.tsx`) and there is no hamburger. Page titles use the slim `PageHeader` row, not a banded strip: title on the left, actions on the right, and **no explanatory subtitle**. `description` is only for record facts on detail pages (e.g. "Pelanggan · Status"). Page content is not forced to viewport height.

**Dashboard:** the first card is the overview (`components/dashboard/personal/home-overview.tsx`): an inverse greeting band (date, greeting, today's lead, "+ Costing baru") on top of the KPI strip, the revenue-per-month chart, the monthly target (own view only) and the first four follow-ups. KPI notes are shown only when they carry a number worth reading. Everything else (cashflow, sales tab, cost analysis) sits below in "Insight utama". The salesperson switcher sits in the page toolbar.

**Costing project page:** full-width page that scrolls with the page on every device. Below `xl` it is one column; from `xl` (1280px) it is two columns: item cards on the left, a sticky 24rem sidebar (price bar, margins card, Finalkan) on the right. Mobile order: header (breadcrumb, name, status, Buat penawaran, ⋯), sticky price bar, item cards, "Tambah item", margins card, Finalkan. Item cards: at most one open at a time and all may be closed; clicking the card header toggles it (no chevron), pressing and holding the header drags it (no grip handle), and the ⋯ menu holds Ganti nama, Pindah ke atas/bawah (keyboard reordering) and Hapus. "Tambah item" offers Single Item, Group Item and Auto-AHU. The opened editor sits flush in the card (no nested bordered card). Save feedback comes from `lib/save-state.ts`; finalize/draft confirmations use `confirm` with `destructive: false` and only state what is true.

**Costing editors:** manual items use Indonesian labels (Nama, Satuan, Harga satuan, Subtotal), "+ Tambah material" (primary) and "+ Tambah bagian" (secondary). A bagian (sub-assembly) can hold sub-bagian up to 3 levels (`lib/manual-group-tree.ts`); its header is chevron + name + rolled-up total + ⋯ (Ganti nama, Tambah material, Tambah sub-bagian, Pindah ke atas/bawah, Hapus), with no grip handle. `ManualCostingGroup.subtotal` stays own-items-only so sums never double count. The same material may sit in several bagian (the picker notes "dipakai di N bagian"; rows note the total qty). Below `md` a material row is two lines: name + ⋯, then qty × harga satuan │ **subtotal**. AHU items use tabs "1 Unit / 2 Modul / 3 Ringkasan" and show a "Perlu hitung ulang" banner (`lib/ahu-dirty.ts`) while parameters differ from the saved ones. Failed actions toast via `costingErrorMessage`, never `String(e)`. The quotation editor (Item tab) has "Rincian material: Rata / Per bagian", saved per quotation (`Quotation.detailMode`): Rata gives one section per manual segment with identical materials (same source and price) merged; Per bagian lists bagian parent-first with indented sub-bagian and rolled totals. It affects the detailed and internal PDF/Excel; the customer quotation lines stay one per bagian.

**Help module (`/help`):** in-app lessons live as a TypeScript catalog under
`content/help/` (no MDX). Progress is device-local in `localStorage` key
`costing-help-progress` (`completedLessonKeys`, `lastOpenedKey`, `updatedAt`).
Lesson steps may reference a `demoId` rendered by `components/help/help-demo-registry.tsx`
with `motion/react` — honor `useReducedMotion()` (static end-frame). No video
embeds. Nav label is **Help**; body copy is Indonesian sentence case. Entry
points: the account (avatar) menu item Help, which opens the lesson for the
current route (`lessonsForRoute`) or the hub; Settings onboarding CTA,
`ContextualHelpLink`, and optional `EmptyState` secondary action. There is no
`?` icon in the header when Clerk is on (it remains only in dev without Clerk).

**Tutorials (`components/tour/`, `content/tutorials/`):** a 6-step welcome tour
shows once per user, then each module offers a "Coba sendiri" tutorial on first
visit (invite card: Mulai / Lewati). Spec:
`docs/superpowers/specs/2026-10-24-onboarding-tutorial-design.md`. Rules:
at most two buttons per card (info step: Lewati + Lanjut/Selesai; action step:
Lewati + hint, advances when the user does the action). Steps are data in
`content/tutorials/<key>.ts` with `{ id, en }` copy; targets are
`data-tour="<module>.<element>"` attributes, actions call
`tourEvent("<module>.<past-tense>")` from the existing success handler. From
`lg` the card floats beside the target; below `lg` it docks above the bottom
bar (or at the top when the target is down there) and collapses to one line
while the on-screen keyboard is open. A missing target is skipped after 3s.
Progress is per user in `TutorialProgress` (`/api/tutorials`), mirrored in
`localStorage` key `costing-tour-progress`. Under `AUTH_BYPASS` nothing opens by
itself; force one with `?tour=<key>`. Replay: account menu "Ulangi tur selamat
datang" and the Help hub.

**Density:** match neighboring screens. The dashboard, costing workspace, and
database module all use the `w-full px-4 py-6 sm:px-6 lg:px-8` (full width, no max-width)
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
use (Dashboard, Costing, Database, Documentation, Help, Settings).

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
