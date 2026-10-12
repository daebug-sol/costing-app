# UX/UI overhaul: header, content layout, costing flow (Dot Matrix)

Status: draft for review, not implemented.
Builds on draft PR #12 (head 46246ad): it already ships the Dot Matrix palette, DM Sans + Doto, dot primitives, restyled card/button/tabs/table and the personal dashboard. Sections 5 and 6 below are therefore covered by #12 and are kept only as the agreed intent.
Supersedes (where they conflict): `2026-10-11-costing-workspace-revamp-design.md` sections 2 (side panel) and 4 (status stepper). PR 1 of that spec (project list + `?project=` routing) is already merged and stays.

## Intent (agreed with dae)
- Every part of the UI is equally painful today: adding items, filling item content, and understanding price/finishing. Goal is a full overhaul, not a patch.
- Typical use: small projects (1-3 items), on desktop, tablet and phone about equally.
- **Principle: follow conventional UI patterns.** The app was built by improvisation; placement and flow should look like what users already know from common business/SaaS apps. Each decision below is checked against "is this a common pattern?".
- Visual language: the Dot Matrix theme already built (see project files `costing-revamp/dotmatrix`, `costing-revamp/pr1`).
- Scope: header, content layout, the costing flow first; then other pages. UI only.

## Constraints
- No edits to `lib/calculations/**`, `lib/ahu-*.ts`, `lib/project-rollup.ts`, `prisma/**`, `app/api/**`. Same data hook (`use-costing-workspace`).
- Follow `docs/UI-HARNESS.md`: `components/ui/*`, semantic tokens only, lucide icons, `aria-label` on icon-only buttons, one `<h1>` per page, AlertDialog for destructive/confirm actions, full state matrix (idle/pending/success/error/empty/loading), Indonesian copy per `docs/UI-COPY-GUIDE.md`, strings through `lib/i18n` (ID source of truth, EN complete).

## 1. Global header and page frame
- Single sticky top bar (palette, fonts and the wordmark come from #12; the active item keeps #12's pill style): logo (left); main menu **Dashboard, Database, Costing, Dokumentasi**; right cluster: Help (`?` icon button, `aria-label` + tooltip "Bantuan"), language switcher, account.
- Help is **not** a main menu item. Contextual help links per page stay.
- Phone/small tablet: bottom bar with the 4 main menu items (icon + label); Help and settings live in the account menu at the top right.
- Remove the large "Workspace / Costing / description" band. Each page has one `<h1>` row (title left, primary action right) directly under the bar.
- Content width: existing shell `max-w-[1400px]`; the project workspace content is a centered column (~880px) so numbers and tables do not stretch.
- Cards: uppercase header, DM Sans 600-700, letter-spacing; consistent `space-y-6`.

## 2. Costing: project list (`/costing`)
Already built in PR 1; adjust to the pattern: title + **+ Proyek baru** (top right), search, status tabs (Semua / Draft / Final), month filter visible, list rows open the project. Penawaran is an action, not a tab.

## 3. Costing: project page (`/costing?project=<id>`), approach A (single page)
One column, same on all devices.

1. **Top**: breadcrumb "Proyek › Nama"; editable project name; status badge (Draft/Final); primary button **Buat penawaran**; overflow (⋯) menu: Finalkan / Kembalikan ke draft, Duplikat, Hapus (AlertDialog).
2. **Sticky price bar**: Total biaya, Harga jual, Per unit (hero numbers in dot style) plus save state "Menyimpan… / Tersimpan / Gagal, coba lagi". Qty penawaran editable in the header row.
3. **Items**: empty state "Belum ada item" with two large buttons (Item manual, AHU otomatis; AHU only if the module is enabled). With items: cards (number, name, type badge, subtotal, ⋯ menu: Ganti nama, Duplikat, Hapus). One card expanded at a time (accordion); drag handle keeps existing ordering. Dashed **+ Tambah item** below the list opens the same two choices. No `document.querySelector` click-through.
4. **Biaya tambahan & margin**: one card under the items (overhead, kontinjensi, eskalasi, asuransi, mobilisasi, margin) with labels, units and per-field save state. On very wide screens (>=1280px) it may sit as a right column; otherwise it stays below.
5. **End**: Finalkan / Buat penawaran repeated at the page end for long projects.

Vocabulary: **item** = a row in the list; **baris** = a line inside an item; **grup** = a group of lines.

### Status and finishing
- Status is only `draft` / `finalized` (as in code). "Penawaran" is an action.
- Finalkan opens an AlertDialog stating only what is true. Today finalizing sets status and locks nothing; copy: "Tandai proyek ini final? Anda tetap bisa mengembalikannya ke draft." Add "Kembalikan ke draft" for finalized projects. If locking is wanted later it is a separate decision.

## 4. Item editors (mounted inside the expanded card, logic unchanged)
- **Manual**: table Nama / Qty / Satuan / Harga satuan / Subtotal, Indonesian labels only (remove "Unit price", "SELLING PRICE", "Cancel", "Add"). **+ Tambah baris** primary under the table, **+ Tambah grup** secondary. Under `md`, each row renders as a card. Item subtotal shown in the card header.
- **AHU**: numbered tabs 1 Unit, 2 Modul, 3 Ringkasan. When params are saved but totals are stale: "Perlu hitung ulang" banner with a Hitung ulang button next to it. When and how recalculation runs does not change.

## 5. Dot Matrix application
- Dots only for hero numbers (price bar), meters and rings. Tables, forms and charts stay plain and readable. Charts are real vector bars/lines.
- Semantic tokens, light and dark; honor `prefers-reduced-motion`.

## 6. Dashboard (from dae's earlier feedback)
Personal per salesperson, no rankings or leaderboard. First card: greeting (selamat pagi/siang/sore/malam + name), clock, date, target progress; then "Hari ini" (tindak lanjut, jadwal). Card headers uppercase DM Sans. Manager/team view undecided and out of scope here.

## 7. Other pages
Customers, Database, Documentation, Settings, Help get the new header/page frame and card style only; no flow changes in this overhaul unless they break the conventional-pattern rule (to be listed in the plan).

## 8. Delivery (UI-HARNESS section 8 cadence, one PR each)
1. **Frame**: 4-item menu, Help icon, bottom bar, page-title row, i18n additions (theme and card header style already in #12).
2. **Costing project page**: price bar, items accordion, add-item, margins card, status/finalize dialogs.
3. **Editors**: manual table + mobile cards, AHU tabs and stale banner, error messages with "Coba lagi".
4. ~~Dashboard personal view~~ shipped in #12.
5. **Polish**: remaining pages' frame, a11y pass, Playwright baselines.

## 9. Testing
Jest for new pure helpers; update `tests/ui/*` specs and baselines (intentional); screenshots desktop, tablet and mobile per PR; `npm run lint`, `typecheck`, `test`, `ui:standard` before each PR; Playwright against a local DB only.

## 10. Risks
- `ManualWorkspace.tsx` (~1,300 lines) and `use-costing-workspace.tsx` (~650) are large; they are re-mounted, not rewritten, except the table/mobile-card change in PR 3.
- Per-segment open/collapsed state in `store/uiWorkflowStore.ts` becomes an "one open item" state; keep persisted keys readable.
- Bottom bar on phone changes navigation muscle memory; Help moving to the account menu must stay discoverable.
- Dashboard personal view needs per-user data that may not exist (targets, schedule); confirm data sources in the plan before building.
