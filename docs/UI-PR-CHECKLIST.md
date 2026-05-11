# UI PR checklist

Copy the relevant block into the PR description. Tick boxes as you verify.
The full standards live in [`UI-HARNESS.md`](./UI-HARNESS.md).

---

## Quick gate (every UI PR)

```markdown
### UI gates
- [ ] `npm run lint` has no new warnings/errors in touched files (legacy debt tracked separately)
- [ ] `npm test` green
- [ ] `npm run ui:test` green — or baselines updated and reviewed
- [ ] Used existing primitives in `components/ui/*` (no parallel design system)
- [ ] No calculation logic changed (or `costing-formula-change` skill followed)
- [ ] Copy follows `docs/UI-COPY-GUIDE.md`
```

---

## Per-screen walk-through

For each screen the PR changes, confirm:

```markdown
### Screen: <name / route>

#### Layout & density
- [ ] Page shell matches neighboring screens (`mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8`, `space-y-6`)
- [ ] Card padding (`p-3`–`p-4`) and heading scale unchanged unless intentional
- [ ] Tokens only — `bg-card`, `text-muted-foreground`, `border-border`, etc. No raw hex unless added to `app/globals.css`

#### Interaction & feedback
- [ ] Idle / pending / success / error / empty / loading states implemented for every async action
- [ ] Pending indicator appears within 150 ms; trigger is `disabled` + `aria-busy="true"`
- [ ] Field validation is inline (`text-rose-600 text-xs`); only API/unexpected errors toast
- [ ] Destructive actions confirm via `Dialog` (no `window.confirm`); destructive button on the right
- [ ] Latency budgets met (see `UI-HARNESS.md` §2.2)

#### Accessibility (WCAG 2.1 AA)
- [ ] Exactly one `<h1>` per route
- [ ] Tab order matches visual order; no `tabIndex > 0`
- [ ] Focus rings preserved on all interactive elements
- [ ] Color is not the only signal for positive/negative/warning
- [ ] Every `<Input>` / `<Select>` paired with `<Label>`
- [ ] Icon-only buttons have `aria-label`
- [ ] Dialog title set; focus trap intact
- [ ] Keyboard-only smoke pass (cannot get stuck without a mouse)
- [ ] `prefers-reduced-motion` respected by any new animation

#### Copy (Indonesian primary)
- [ ] Sentence case, no shouting
- [ ] Money via `formatIDR`, percentages via `formatPercent`
- [ ] Empty-state CTAs name the destination ("Buka Costing", not "Mulai")
- [ ] Error messages are actionable ("Gagal memuat dashboard. Coba lagi.")
```

---

## Visual baseline change

If `npm run ui:test` produced diffs you intend to accept:

```markdown
### Visual baselines updated
- [ ] Reviewed every diff in `playwright-report/` before re-baselining
- [ ] Ran `npm run ui:test:update` and committed the new PNGs under `tests/ui/__screenshots__/`
- [ ] Listed which baselines changed and why in this PR description
- [ ] Route coverage still includes: `/`, `/costing`, `/database`, `/documentation`, `/settings`
```

---

## New flow / large surface

For PRs that introduce a new task or page, also update:

```markdown
- [ ] Added a scenario to `docs/UX-ACCEPTANCE-SCENARIOS.md`
- [ ] Added a Playwright spec under `tests/ui/<flow>.visual.spec.ts`
- [ ] Recorded any new copy patterns in `docs/UI-COPY-GUIDE.md`
- [ ] Updated `UI-HARNESS.md` if a new primitive or convention landed
```
