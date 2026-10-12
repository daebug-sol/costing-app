# Dot Matrix theme for the whole app: design spec (draft for review)

Status: draft, waiting for dae's review.
Reference: dashboard sample, https://claude.ai/artifact/1EiQs7d9y6Xm5Aokk1qhuk (version 18).
Scope: look, feel and the dashboard rebuild. No changes to `lib/calculations/**`, `lib/ahu-*.ts`, `lib/project-rollup.ts`.

## Goal
Every screen shares one recognisable, less generic look (Dot Matrix), and the dashboard becomes a personal home for each salesperson.

## What the style is
- Tokens: canvas, card, raised, quiet (recessed), ink, muted, track, **signal** (red, for alarms and pointers), **positive** (green, for good news). Light and dark, both with clear separation between page and card.
- Fonts: **DM Sans** for text, **Doto** for dot numbers (hero numbers, clock, KPI values). Replaces Inter and Cormorant Garamond. Plex Mono stays for code-like cells.
- Shape: radius 8 / 16 / 24, hairline ring on cards in light mode, no shadows, no gradients, no blur.
- Card headers: uppercase, DM Sans 600, letter-spaced, with a small square marker. Deliberate exception to the sentence-case rule in `docs/UI-COPY-GUIDE.md` §2 (dae's request); the guide is updated in the same PR.
- Anything that measures (progress, share, status counts) can be drawn as dots. Charts that need reading (revenue, cashflow) are real vector charts with a micro pixel texture.
- Three card tiers: feature (inverse, dot-grid background, one per page), standard, quiet.

## Approach
Add a third palette, `dotmatrix`, next to `professional` and `warm`, and make it the default. The shadcn variables (`--card`, `--background`, `--border`, ...) are remapped, so every existing `components/ui/*` consumer changes look without per-page edits. Users who picked another palette keep it. Rollback is one default value.

## Delivery: 4 PRs
1. **Theme foundation.** `globals.css` palette, fonts in `layout.tsx`, `THEME_INIT_SCRIPT` and the palette picker in Pengaturan, `components/ui/card.tsx` (uppercase header), `button`, `badge`, `table`, `tabs`, Navbar and page shell. Update `UI-HARNESS.md` and `UI-COPY-GUIDE.md`. Visual baselines regenerated (intended change).
2. **Primitives.** `DotNumber`, `DotMeter`, `DotRing`, `DotGrid` (fills its box, dots shrink as count grows), pixel-textured bar and curve helpers, trend sparkline. Unit tested where there is logic.
3. **Dashboard.** Rebuild from the sample on the existing `/api/dashboard` data. Personal view: greeting + clock + date + month target, KPI row, tindak lanjut, revenue and cashflow charts, quotation status, funnel, receivables aging, price composition, largest open invoices. `sales-leaderboard.tsx` is removed (no rankings). Wording follows the reviewed copy in the sample.
4. **Remaining pages.** Costing, Database, Documentation, Customers, Sales orders, Invoices, Payments, Settings, Help, auth pages: apply tiers, headers and dot numbers where numbers are shown; fix anything the token swap leaves ugly. One PR if small, otherwise split by area.

Order matters: 1 and 2 first, then 3 and 4 can run in parallel.

## Data decisions for the dashboard (need dae's answer)
The sample used example data. In the real data model:
- **Salesperson identity.** `Quotation.salesman` is free text. Default: match it to the signed-in member's display name; owners and admins can switch to "Semua" or another salesperson.
- **Monthly target.** No field exists. Default: add `monthlyTarget` per member (Prisma migration, tenant-scoped); until set, the card shows "Atur target" instead of progress.
- **Tindak lanjut.** No table exists. Default: derive from data (quotations expiring soon, overdue invoices, sales orders waiting), read-only, no manual to-do list yet.
- **Jadwal.** No source. Default: left out of the first release.

## Constraints and checks
- Semantic tokens only; new tokens are defined once in `globals.css`. Status colours: signal (red), positive (green), amber for warning only.
- Money through `formatIDR`; no `Intl` ad hoc. Every async block keeps loading, empty and error states. Every chart has a table alternative and `aria-label`s; colour is never the only signal.
- Tenant scoping unchanged. The new target field is read and written by `organizationId` and member.
- `npm run lint`, `typecheck`, `test`, `ui:standard`; screenshots (desktop and mobile, light and dark) per PR; `ui:test:update` only for these intended changes.

## Out of scope
Costing formulas, exports (PDF/Excel look is separate), new product features beyond the dashboard data above, a manager/team dashboard (undecided; the "Semua" switch is the only concession).
