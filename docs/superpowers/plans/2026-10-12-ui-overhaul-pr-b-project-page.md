# UI Overhaul PR B: Costing Project Page (single column) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the nested-scroll project editor with one conventional page column: header with status and primary action, a sticky price bar, item cards (one open at a time), a visible "Tambah item", a margins card with save state, and an honest finalize flow.

**Architecture:** `CostingMain` becomes a thin composition of small components under `components/costing/`. Data and actions stay in `useCostingWorkspace`; the editors (`ManualWorkspace`, `AhuSegmentEditor`) are mounted unchanged inside item cards. The project page scrolls with the page (no inner scroll container), so the price bar can be `sticky`.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, shadcn `components/ui/*`, dnd-kit (existing), zustand stores, Jest (node env, `renderToStaticMarkup` for components), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-11-ux-ui-overhaul-design.md` (section 3, status rules). **Base:** PR #13 branch; stack on it.

## Global Constraints

- UI only: never edit `lib/calculations/**`, `lib/ahu-*.ts`, `lib/project-rollup.ts`, `prisma/**`, `app/api/**`. Use existing `useCostingWorkspace` actions (`updateProject`, `persistMargins`, `persistToggles`, `addSegment`, `addManualItem`, `addManualGroupItem`, `deleteSegment`, `patchSegment`, `confirm`).
- Status is only `draft` / `finalized` (`updateProject({ status })`); "Penawaran" is the link `/documentation?fromProject=<id>`. Finalizing locks nothing; copy must not claim it does.
- Vocabulary: **item** = a row in the list, **baris** = a line inside an item, **grup** = a group of lines.
- Reuse `components/ui/*`, semantic tokens only, lucide icons, `aria-label` on icon-only buttons, `confirm()` (the repo's dialog) for destructive/finalize, one `<h1>` per page (PageHeader) — the project name is an `<h2>`, as today (tests use `getByRole("heading", { name })`).
- Hero numbers use `DotNumber` (`components/dot/dot-number.tsx`) only in the price bar; everything else plain text.
- New strings in `lib/i18n/messages.ts` (`id` + `en`, identical `{placeholders}`), keys prefixed `costing.page.`.
- Run `npm run lint`, `typecheck`, `npm test`, `npm run ui:standard` before opening the PR; Playwright against local DB only.

## Review Focus

- A project with 0 items: price bar shows Rp 0 for all three numbers; empty state offers Item manual and (if module enabled) AHU otomatis; no `document.querySelector` click-through remains. (Task 3)
- Opening an item closes the previously open one; deleting the open item leaves none open without errors. (Task 3 test)
- A failed margin save shows "Gagal menyimpan" with a retry action and keeps the typed value. (Task 1 test + Task 2)
- Finalize dialog names the project and says it can be reverted; a finalized project shows "Kembalikan ke draft" and no "Finalkan". (Task 3)
- Price bar stays visible under the top bar while scrolling a long project and does not overlap the bottom bar on phones (390px). (Task 5 Playwright)
- Long item names and large rupiah values do not overflow cards or the price bar at 390px. (Task 5 Playwright)

---

## File Structure

- Create `lib/save-state.ts` + `lib/save-state.test.ts`: pure save-state reducer and `useSaveState` hook.
- Create `lib/segment-open.ts` + `lib/segment-open.test.ts`: pure `openOnly(ids, openId)` helper.
- Create `components/costing/project-price-bar.tsx`, `margins-card.tsx`, `project-header.tsx`, `segment-card.tsx`, `add-item-menu.tsx`.
- Modify `components/costing/costing-main.tsx` (compose), `costing-workspace.tsx` (page scroll), `lib/i18n/messages.ts`.
- Modify `tests/ui/costing.stateful.spec.ts`, `tests/ui/costing.visual.spec.ts`; update baselines.

---

### Task 1: Save state and single-open helper

**Files:** Create `lib/save-state.ts`, `lib/save-state.test.ts`, `lib/segment-open.ts`, `lib/segment-open.test.ts`.

**Interfaces:**
- Produces: `type SaveState = "idle" | "saving" | "saved" | "error"`; `nextSaveState(current: SaveState, event: "start" | "ok" | "fail" | "reset"): SaveState`; `useSaveState(): { state: SaveState; run: (fn: () => Promise<void>) => Promise<boolean>; reset: () => void }` (`run` sets saving, then saved on success / error on throw, returns success; "saved" falls back to "idle" after 2500 ms); `openOnly(ids: readonly string[], openId: string | null): Record<string, boolean>` (true only for `openId` if it is in `ids`, all others false).

- [ ] **Step 1: Write failing tests.** `save-state.test.ts`: `nextSaveState("idle","start")==="saving"`, `("saving","ok")==="saved"`, `("saving","fail")==="error"`, `("error","start")==="saving"`, `("saved","reset")==="idle"`, `("idle","ok")==="idle"` (ignored). `segment-open.test.ts`: `openOnly(["a","b"],"b")` equals `{a:false,b:true}`; `openOnly(["a"],null)` equals `{a:false}`; `openOnly(["a"],"zzz")` equals `{a:false}`.
- [ ] **Step 2: Run** `npx jest lib/save-state.test.ts lib/segment-open.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** both modules as specified (the hook uses `useState`, `useRef` for the timer, clears it on unmount; add `"use client"` to `save-state.ts`).
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Add i18n keys** (id / en): `costing.page.saving` "Menyimpan…" / "Saving…", `costing.page.saved` "Tersimpan" / "Saved", `costing.page.saveFailed` "Gagal menyimpan" / "Save failed", `costing.page.retry` "Coba lagi" / "Try again", `costing.page.totalCost` "Total biaya" / "Total cost", `costing.page.sellingPrice` "Harga jual" / "Selling price", `costing.page.perUnit` "Per unit" / "Per unit", `costing.page.addItem` "Tambah item" / "Add item", `costing.page.itemManual` "Item manual" / "Manual item", `costing.page.itemGroup` "Item grup" / "Group item", `costing.page.itemAhu` "AHU otomatis" / "Automatic AHU", `costing.page.emptyTitle` "Belum ada item" / "No items yet", `costing.page.emptyDescription` "Mulai dengan item manual atau AHU otomatis. Satu penawaran bisa berisi banyak item." / "Start with a manual item or automatic AHU. One quotation can hold many items.", `costing.page.marginsTitle` "Biaya tambahan dan margin" / "Extra costs and margin", `costing.page.qty` "Qty penawaran" / "Quotation qty", `costing.page.finalize` "Finalkan" / "Finalize", `costing.page.backToDraft` "Kembalikan ke draft" / "Back to draft", `costing.page.createQuotation` "Buat penawaran" / "Create quotation", `costing.page.finalizeTitle` "Tandai {name} sebagai final?" / "Mark {name} as final?", `costing.page.finalizeDescription` "Anda tetap bisa mengembalikannya ke draft kapan saja." / "You can switch it back to draft at any time.", `costing.page.draftTitle` "Kembalikan {name} ke draft?" / "Move {name} back to draft?", `costing.page.draftDescription` "Proyek akan berstatus draft lagi." / "The project becomes a draft again.", `costing.page.renameItem` "Nama item {name}" / "Item name {name}", `costing.page.deleteItem` "Hapus item" / "Delete item", `costing.page.itemMenu` "Menu item {name}" / "Item menu {name}", `costing.page.subtotal` "Subtotal HPP" / "HPP subtotal".
- [ ] **Step 6: Run** `npx jest lib/i18n lib/save-state.test.ts lib/segment-open.test.ts`. Expected: PASS. **Commit** `feat(costing): save-state and single-open helpers, page strings`.

### Task 2: Price bar and margins card

**Files:** Create `components/costing/project-price-bar.tsx`, `components/costing/margins-card.tsx`; Test: `components/costing/costing-page.test.tsx`.

**Interfaces:**
- Consumes: `useSaveState` (Task 1); `CostingWorkspaceState` fields `totals`, `marginPct`, `setMarginPct`, `useEsk/useAsu/useMob` (+setters), `persistMargins`, `persistToggles`; `formatIDR`.
- Produces: `ProjectPriceBar({ totals, saveState, onRetry }: { totals: CostingWorkspaceState["totals"]; saveState: SaveState; onRetry: () => void })` — `sticky top-14 z-30` card, three labeled values (`totalCost`, `sellingPrice` as hero `DotNumber`, `perUnit`), a `role="status"` live region showing saving/saved/failed text and a "Coba lagi" button when `error`. `MarginsCard({ ed }: { ed: CostingWorkspaceState })` — `Card` titled `marginsTitle` with Overhead, Kontinjensi, Eskalasi (+switch), Asuransi (+switch), Mobilisasi (+switch), Margin rows (label, % input with `Label`, resulting amount), saves via `useSaveState().run(persistMargins)` on blur and `persistToggles` on switch, and shows the same status text; exports `useMarginsSave()` returning `{ state, retry }` so the page can feed the price bar. (If the shared state is simpler to lift into `CostingMain`, `CostingMain` owns `useSaveState` and passes `state`/`run` into both; choose that.)

- [ ] **Step 1: Write failing tests** in `costing-page.test.tsx` (`renderToStaticMarkup`, wrap in `I18nProvider`): price bar renders "Total biaya", "Harga jual", "Per unit" and `Rp 0` formatted values for zero totals (use `formatIDR(0)` for the expected string); with `saveState="error"` it renders a button named "Coba lagi"; with `saved` it renders "Tersimpan"; margins card renders six labeled inputs (`Overhead`, `Kontinjensi`, `Eskalasi`, `Asuransi`, `Mobilisasi`, `Margin`) when given a minimal `ed` stub (cast `as unknown as CostingWorkspaceState`).
- [ ] **Step 2: Run** `npx jest components/costing/costing-page.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** both components per Interfaces, porting the field logic from the current summary table in `costing-main.tsx` (same `setMarginPct` / `persistMargins` / `persistToggles` calls and number parsing), with each number input wrapped in a `Label` + `aria-label`, `%` suffix, amount to the right (`tabular-money`).
- [ ] **Step 4: Run** the test. Expected: PASS. **Commit** `feat(costing): sticky price bar and margins card`.

### Task 3: Item cards and add-item menu

**Files:** Create `components/costing/segment-card.tsx`, `components/costing/add-item-menu.tsx`; Test: extend `costing-page.test.tsx`.

**Interfaces:**
- Consumes: `openOnly` (Task 1); `SortableCostingSegment` (existing, `costing-workspace-shared.tsx`); `AssemblyTypeBadge`; `ManualWorkspace`, `AhuSegmentEditor` (props as used today in `costing-main.tsx`); `ed.confirm`, `ed.deleteSegment`, `ed.patchSegment`, `ed.patchCostingOpenSegment`, `ed.openSegments`.
- Produces: `SegmentCard({ ed, seg, index, open, onToggle }: { ed: CostingWorkspaceState; seg: CostingWorkspaceState["segments"][number]; index: number; open: boolean; onToggle: () => void })` — a `Card` with drag handle (existing dnd props), numbered title, type badge, inline-editable name (blur saves via `patchSegment`, `aria-label` = `renameItem`), subtotal text (`subtotal` label), expand button (`aria-expanded`), ⋯ `DropdownMenu` (`aria-label` = `itemMenu`) containing only "Hapus item" (confirm names the item, uses existing `costing.deleteItemTitle/Description`); body mounts the editor exactly as `costing-main.tsx` does today. `AddItemMenu({ ed, variant }: { ed: CostingWorkspaceState; variant: "empty" | "inline" })` — `inline`: dashed full-width `Button` "Tambah item" opening a `DropdownMenu` with Item manual (`addManualItem`), Item grup (`addManualGroupItem`), AHU otomatis (`addSegment("ahu")`, only if `ahuModuleEnabled`); `empty`: two large buttons Item manual and AHU otomatis (AHU only if enabled), each calling the same actions, errors through `showToast(costingErrorMessage(e))`.

- [ ] **Step 1: Write failing tests:** `SegmentCard` markup for a manual segment stub includes the item name input labeled "Nama item Foo", the menu button "Menu item Foo", and `aria-expanded="false"` when `open=false`; `AddItemMenu variant="empty"` renders "Item manual" and omits "AHU otomatis" when `ahuModuleEnabled` is false, includes it when true.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Implement** both components; port markup and handlers from the current row in `costing-main.tsx` (drag handle props, title blur, delete confirm); the card never nests a `<table>`.
- [ ] **Step 4: Run** the file. Expected: PASS. **Commit** `feat(costing): item cards and add-item menu`.

### Task 4: Header, finalize flow, composition, page scroll

**Files:** Create `components/costing/project-header.tsx`; Modify `components/costing/costing-main.tsx`, `components/costing/costing-workspace.tsx`.

**Interfaces:**
- Produces: `ProjectHeader({ ed }: { ed: CostingWorkspaceState })` — breadcrumb link `costing.project.back` ("Semua proyek") to `/costing`; `<h2>` project name; status badge (`ed.statusBadge`); Qty input (`Label` "Qty penawaran", same `updateProject({ qty })` blur logic); primary `Button asChild` link "Buat penawaran" to `/documentation?fromProject=<id>`; ⋯ menu with one item: when draft "Finalkan" → `confirm({ title: finalizeTitle{name}, description: finalizeDescription })` then `updateProject({ status: "finalized" })`; when finalized "Kembalikan ke draft" → confirm (`draftTitle`/`draftDescription`) then `updateProject({ status: "draft" })`; errors via `showToast(costingErrorMessage(e))`. Finalized detection: `status.toLowerCase()` is `finalized` or `final` (same as `statusBadge`).
- `CostingMain` composes: `ProjectHeader`, `ProjectPriceBar`, item list (`DndContext`/`SortableContext` as today, `SegmentCard`s with a single open id held in local `useState`, initialised to the first segment, toggled through `openOnly`), `AddItemMenu inline` (and `empty` when no segments), `MarginsCard`, repeated Finalkan/Buat penawaran buttons at the page end. No `<main>` scroll container; remove the old summary collapsible, "Ciutkan semua/Buka semua", the round "+" and `data-add-item-trigger`. `CostingWorkspace`: drop `h-[calc(100vh-3.5rem)] overflow-hidden`; wrapper becomes `min-h-[calc(100vh-3.5rem)]`, inner column `max-w-[880px]` for the project view and `wide` for the list; keep `PageHeader` for the list view only (project view starts with the breadcrumb).

- [ ] **Step 1: Implement** `ProjectHeader`, then rewrite `costing-main.tsx` (target under 250 lines) and the wrapper in `costing-workspace.tsx` per Interfaces. Remove `ref`/`onScroll` from the main element; leave the hook's scroll fields untouched.
- [ ] **Step 2: Typecheck/lint/unit:** `npm run typecheck && npm run lint && npx jest`. Expected: pass, no new warnings in touched files.
- [ ] **Step 3: Manual run** (`npm run dev` against the local DB, `AUTH_BYPASS=true`): create a project, add a manual item and an AHU item, edit a margin, finalize and revert; confirm each action gives feedback and the page scrolls as one column.
- [ ] **Step 4: Commit** `feat(costing): single-column project page`.

### Task 5: Playwright coverage, baselines, docs

**Files:** Modify `tests/ui/costing.stateful.spec.ts`, `tests/ui/costing.visual.spec.ts`, `docs/UI-HARNESS.md`; update baselines.

- [ ] **Step 1: Extend `costing.stateful.spec.ts`** (runs in `stateful` project; create project via `request.post("/api/projects", …)`, delete in `finally`): (a) empty project shows "Belum ada item" and a button "Item manual"; clicking it adds an item card whose name input is visible and the price bar shows "Total biaya", "Harga jual", "Per unit"; (b) "Finalkan" in the ⋯ menu opens a dialog titled `Tandai <name> sebagai final?`, confirming shows badge "Final" and the menu now offers "Kembalikan ke draft"; (c) at 390px width the price bar is visible after scrolling and `scrollWidth <= innerWidth`.
- [ ] **Step 2: Run** `npm run ui:test` (local DB, see CLAUDE.md). Expected: new tests pass; update the costing visual baseline with `npm run ui:test:update -- tests/ui/costing.visual.spec.ts` and review the diff.
- [ ] **Step 3: Update `docs/UI-HARNESS.md`** with a short "Costing project page" paragraph (single column, sticky price bar, honest finalize copy).
- [ ] **Step 4: Run** `npm run lint`, `typecheck`, `npm test`, `npm run ui:standard`. Expected: all pass. **Commit** `test(costing): project page coverage and baselines`; open a draft PR with base = PR A's branch.
