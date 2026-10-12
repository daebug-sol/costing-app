# Dot Matrix theme, PR 3: personal dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/` becomes a personal home for one salesperson (greeting, clock, month target, own KPIs, own follow-ups, own charts), styled with the Dot Matrix primitives, with no rankings.

**Architecture:** `/api/dashboard` gains a salesman scope (members see only their own numbers; owner/admin can pick "Semua" or a person) and a `personal` block built by pure functions in `lib/dashboard-personal.ts`. The page keeps the existing analytics payload for the lower sections and adds new presentational components under `components/dashboard/personal/`. The profit bridge and cost breakdown (not in the sample) stay, moved into a collapsed "Analisis biaya" section.

**Tech Stack:** Next.js 16 route handler, Prisma 7 (one migration), React 19, jest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-11-dot-matrix-theme-design.md` (delivery item 3, "Data decisions"). Sample: https://claude.ai/artifact/1EiQs7d9y6Xm5Aokk1qhuk

## Global Constraints

- Data defaults fixed by dae (2026-10-11): salesperson = signed-in member's display name matched to `Quotation.salesman` (trimmed, case-insensitive); owner and admin may switch to "Semua" or another name; monthly target = new per-member field, until set the card shows "Atur target"; follow-ups derived from data, read-only; no "Jadwal" card.
- No rankings or comparisons between salespeople anywhere. A person is compared only with their own target and history.
- Every query scoped by `organizationId`; the target is read and written by `organizationId` + `userId` of the caller only.
- Copy follows the reviewed sample wording (formal Indonesian, "Rp 180 jt", card titles uppercase via `CardTitle`); strings through `t()` with `en` parity.
- Colors only through tokens: `text-signal` (alarm, overdue), `text-positive` (good), `Card tone="feature"` for the greeting card (one per page).
- Never touch `lib/calculations/**`, `lib/ahu-*.ts`, `lib/project-rollup.ts`. Money via `formatIDR`; no NaN/Infinity rendered.

## Review Focus

- A member whose name matches no quotation sees an empty-state home (zeros, "Belum ada penawaran"), not another person's data or an error.
- Two members with the same display name see the same numbers (known limit of name matching); documented in the PR description.
- Owner/admin "Semua" equals today's org-wide totals exactly.
- A member cannot read another person's numbers by passing `?salesman=` (the server ignores it for non-admin roles).
- Target = 0 or unset never divides by zero; progress shows "Atur target", and a month with no bookings shows 0 dots lit.
- Clock and greeting use the browser's local time; first server render must not mismatch (render after mount).

---

### Task 1: Monthly target field

**Files:**
- Modify: `prisma/schema.prisma` (OrganizationMember), new migration under `prisma/migrations/`
- Create: `app/api/me/target/route.ts`
- Test: `lib/dashboard-personal.test.ts` (validation helper only), `app/api/tenant-isolation.test.ts` pattern for scoping

**Interfaces:**
- Produces: `OrganizationMember.monthlyTarget Float?` (IDR); `GET /api/me/target` -> `{ monthlyTarget: number | null }`; `PUT /api/me/target` body `{ monthlyTarget: number | null }` -> same shape; `parseMonthlyTarget(input: unknown): number | null | "invalid"` in `lib/dashboard-personal.ts` (null clears; finite number >= 0 accepted; anything else "invalid").

- [ ] **Step 1:** Write `parseMonthlyTarget` tests: `null` -> null, `450000000` -> 450000000, `0` -> 0, `-1`, `"abc"`, `NaN`, `Infinity` -> "invalid".
- [ ] **Step 2:** Run `npx jest lib/dashboard-personal.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `parseMonthlyTarget` in `lib/dashboard-personal.ts`; add the Prisma field and run `npm run db:migrate` locally to create the migration; add the route using `guardApiRoute`, updating only the row `{organizationId, userId}` of the caller (400 on "invalid").
- [ ] **Step 4:** Run the same test. Expected: PASS. Run `npm run typecheck`.
- [ ] **Step 5:** Commit `feat(dashboard): per-member monthly target`.

### Task 2: Salesman scope on the dashboard API

**Files:**
- Modify: `app/api/dashboard/route.ts`, `app/api/me/route.ts`, `lib/dashboard-contract.ts`
- Create: `lib/dashboard-scope.ts`
- Test: `lib/dashboard-scope.test.ts`

**Interfaces:**
- Produces: `resolveSalesmanScope(args: { role: OrgRole; requested: string | null; displayName: string | null }): { mode: "own" | "all" | "person"; salesman: string | null }`: roles `owner`/`admin` honour `requested` (`"__all__"` or empty -> `all`, a name -> `person`); every other role always gets `own` with `displayName` (null name -> `own` with null, meaning "no data"). `matchesSalesman(quotationSalesman: string | null, wanted: string): boolean` (trim, case-insensitive). `/api/me` additionally returns `displayName: string | null` (Clerk full name, else first name, else null; under auth bypass `process.env.TEST_USER_NAME ?? null`).
- Contract: `DashboardApiResponse.scope: { mode: "own" | "all" | "person"; salesman: string | null; options: string[] }` where `options` (distinct non-empty salesman values) is only filled for owner/admin.

- [ ] **Step 1:** Tests: member passing `requested: "Budi"` gets `own` with its own name; admin with `"__all__"` gets `all`; admin with `"Budi"` gets `person`; `matchesSalesman(" rina w. ", "Rina W.")` true, `(null, "x")` false.
- [ ] **Step 2:** Run `npx jest lib/dashboard-scope.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement both functions. In the route, after loading rows, filter `quotations` by scope; filter `salesOrders` and `invoices` to those reachable from a kept quotation (`SalesOrder.quotationId`, `Invoice.salesOrderId`) when scope is not `all`; `projects` stay org-wide except cost sections are untouched. Add `scope` to the payload and to `EMPTY_DASHBOARD_RESPONSE`.
- [ ] **Step 4:** Run the test plus `npx jest app/api` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(dashboard): salesman scope`.

### Task 3: Personal summary

**Files:**
- Modify: `lib/dashboard-personal.ts`, `lib/dashboard-contract.ts`, `app/api/dashboard/route.ts`
- Test: `lib/dashboard-personal.test.ts`

**Interfaces:**
- Produces: `buildPersonalSummary(input: { now: Date; monthlyTarget: number | null; bookedByMonth: Array<{ month: string; booked: number }>; quotations: PersonalQuotation[]; invoices: PersonalInvoice[]; salesOrders: PersonalSalesOrder[] }): DashboardPersonal` where `DashboardPersonal = { monthlyTarget: number | null; bookedThisMonth: number; remaining: number | null; progressPct: number | null; idealPct: number; paceDeltaValue: number | null; bestMonth: { month: string; booked: number } | null; daysLeftInMonth: number; followUps: FollowUp[] }` and `FollowUp = { id: string; kind: "quotation-expiring" | "invoice-overdue" | "order-waiting"; title: string; subtitle: string; dueLabel: "today" | "tomorrow" | "overdue"; overdueDays: number }`. Rules: `idealPct` = day of month / days in month x 100; `paceDeltaValue` = booked - target x idealPct/100 (null without target); quotations expiring within 1 day (`validity`), invoices past `dueDate` with open balance, sales orders `open` older than 7 days; sorted overdue first, then by date; max 6.
- Route returns `personal` using the caller's `monthlyTarget` (own and person scope use that person's own member row only when it is the caller; "Semua" has no target).

- [ ] **Step 1:** Tests with a fixed `now` of 2026-10-11: target 450 jt and 270 jt booked -> `remaining` 180 jt, `progressPct` 60, `idealPct` about 35.5, `paceDeltaValue` about +110 jt; target null -> `progressPct`/`remaining`/`paceDeltaValue` null; target 0 -> same as null; best month picks the max; an invoice due yesterday with open balance -> `overdue`, `overdueDays` 1; a fully paid invoice is excluded; a quotation expiring tomorrow -> `tomorrow`; list capped at 6 and overdue first.
- [ ] **Step 2:** Run the test. Expected: FAIL.
- [ ] **Step 3:** Implement `buildPersonalSummary` as a pure function; wire into the route.
- [ ] **Step 4:** Run `npx jest lib/dashboard-personal.test.ts && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(dashboard): personal summary`.

### Task 4: Personal home UI

**Files:**
- Create: `components/dashboard/personal/greeting-card.tsx`, `target-card.tsx`, `personal-kpis.tsx`, `follow-up-list.tsx`, `scope-switcher.tsx`, `target-dialog.tsx`
- Modify: `components/dashboard/dashboard-page.tsx`, `lib/i18n/messages.ts`
- Test: `components/dashboard/personal/personal.test.tsx`

**Interfaces:**
- Consumes: `DashboardApiResponse.personal` and `.scope` (Tasks 2 and 3), `DotNumber`, `DotMeter`, `DotRing`, `Sparkline` (PR 2).
- Produces: `greetingForHour(hour: number): "pagi" | "siang" | "sore" | "malam"` (pagi < 11, siang < 15, sore < 18, else malam) exported from `greeting-card.tsx`; `<GreetingCard name followUpCount expiringCount remaining newOrdersYesterday />` (feature tone; live clock rendered after mount); `<TargetCard personal onSetTarget />` ("Atur target" button when `monthlyTarget` null, opens `TargetDialog` which PUTs `/api/me/target`); `<PersonalKpis kpis />` with Penjualan, Win rate, Margin, Pipeline terbuka; `<FollowUpList items />` (read-only, no checkboxes; overdue uses `text-signal`); `<ScopeSwitcher scope onChange />` rendered only for owner/admin.

- [ ] **Step 1:** Tests: `greetingForHour(10)` "pagi", `(11)` "siang", `(14)` "siang", `(15)` "sore", `(18)` "malam", `(0)` "malam"; `FollowUpList` renders each title and the overdue label "Terlambat 1 hari"; `TargetCard` with `monthlyTarget: null` renders the "Atur target" button and no meter.
- [ ] **Step 2:** Run `npx jest components/dashboard/personal`. Expected: FAIL.
- [ ] **Step 3:** Implement the components with the sample wording (keys `dashboard.personal.*`, id and en); in `dashboard-page.tsx` put greeting + target first, then KPIs, then follow-ups; remove `SalesLeaderboard` usage and delete `sales-leaderboard.tsx` plus its test id from the Playwright spec.
- [ ] **Step 4:** Run the jest command and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(dashboard): personal home`.

### Task 5: Restyled charts and lower sections

**Files:**
- Modify: `components/dashboard/revenue-trend-chart.tsx`, `cashflow-timeline-chart.tsx`, `status-distribution.tsx`, `quotation-funnel.tsx`, `quotation-aging-table.tsx`, `dashboard-page.tsx`, `lib/i18n/messages.ts`
- Test: `tests/ui/dashboard.visual.spec.ts`

**Interfaces:**
- Consumes: `PixelPattern`, `monotoneCurvePath`, `DotGrid`, `DotMeter`.
- Produces: revenue bars with pixel texture for booked and potential, dashed target line when a target exists; cashflow as a smooth monotone curve with signal-red negative months and positive-green markers; quotation status as `DotGrid`; funnel and composition rows as `DotMeter`; aging as bars with the 90+ bucket in `signal`. Every chart keeps its "Lihat sebagai tabel" alternative and `data-testid` (`revenue-trend-chart`, `cashflow-timeline-chart`, `status-distribution`, `quotation-funnel`, `quotation-aging-table`). Profit bridge and cost breakdown move into a collapsed "Analisis biaya" section, tests ids unchanged.

- [ ] **Step 1:** Update `tests/ui/dashboard.visual.spec.ts` first to the new structure (personal cards visible, charts present, "Analisis biaya" expands to show `profit-bridge-chart` and `cost-breakdown-chart`, no `sales-leaderboard`); run it. Expected: FAIL.
- [ ] **Step 2:** Implement the chart changes and section layout (12-column grid, `c7/c5/c4` spans as in the sample, quiet tone for secondary cards).
- [ ] **Step 3:** Run `npx playwright test -c playwright.local.config.ts tests/ui/dashboard.visual.spec.ts` with the local DB env from CLAUDE.md. Expected: PASS except the baseline.
- [ ] **Step 4:** Update baselines (`--update-snapshots`) after reading screenshots at desktop and mobile, light and dark, for clipped numbers and unreadable charts; fix and repeat.
- [ ] **Step 5:** Run `npm run lint && npm run typecheck && npm test && npm run ui:standard`; commit `feat(dashboard): dot matrix charts and sections`; push; update the PR description.
