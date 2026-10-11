# Costing Revamp PR 1: Project List, Routing, Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/costing` left sidebar with a full-width project list; a project opens at `/costing?project=<id>`, with a way back and consistent copy.

**Architecture:** The view is derived from the URL: no `project` param shows the list, a `project` param shows the existing project editor (`CostingMain`) full width. Data and actions stay in `useCostingWorkspace`; only presentation and navigation change. PR 2 (sticky price strip, items list, side panel) and PR 3 (editor polish) are separate plans.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/01-app/` before touching `useSearchParams`/routing), React 19, Tailwind 4, shadcn `components/ui/*`, zustand stores, Jest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-11-costing-workspace-revamp-design.md` (sections 1, 3 vocabulary, 6 cross-cutting).

## Global Constraints

- UI only: do not edit `lib/calculations/**`, `lib/ahu-*.ts`, `lib/project-rollup.ts`, `prisma/**`, or `app/api/**`.
- Reuse `components/ui/*`, semantic tokens only (no hex), lucide icons, `aria-label` on icon-only buttons, one `<h1>` per page, shell `max-w-[1400px]`.
- New strings go through `lib/i18n/messages.ts` (`id` is source of truth, `en` must have every key and identical `{placeholders}`).
- Vocabulary: **item** = a row in a project's list, **baris** = a line inside an item, **grup** = a group of lines. Indonesian sentence case.
- Dashboard "Buka Costing" (`/costing?project=<id>`, `components/dashboard/dashboard-page.tsx:126`) must keep working.
- Change only what this PR needs; no drive-by restyling.
- Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run ui:standard` before opening the PR; screenshots desktop + mobile; Playwright against a local DB only (see `CLAUDE.md`).

## Review Focus

- `?project=<unknown-or-other-org-id>`: shows a "Proyek tidak ditemukan" state with a link back to the list; never an endless skeleton or crash.
- Direct load or refresh of `?project=B` while the store still holds project A: never renders A's data under B's URL.
- Zero projects: list shows `EmptyState` with "Proyek baru" as the primary action.
- Filters that match nothing: a "no match" message plus a "Reset filter" button; filter values persisted by the old sidebar (`costing.sidebar.*` in `uiWorkflowStore`) are visible as active, not silently applied.
- Project ids with special characters are `encodeURIComponent`-ed in links; creating a project lands on its `?project=` page.

---

## File Structure

- Create `components/costing/costing-project-list.tsx`: full-width list view (search, status/month/date filters shown inline, grouped rows, empty/loading/no-match states).
- Create `lib/costing-error-message.ts` + `lib/costing-error-message.test.ts`: turns unknown errors into a human Indonesian message.
- Modify `components/costing/costing-workspace.tsx`: choose list vs project view from the URL.
- Modify `components/costing/costing-main.tsx`: remove sidebar-collapse button/props, add breadcrumb "Semua proyek", not-found/loading guard.
- Modify `components/costing/use-costing-workspace.tsx`: navigate after create, use the error helper, drop sidebar-collapsed use.
- Modify `components/costing/add-item-dialog.tsx`, `new-project-dialog.tsx`, `costing-main.tsx` (summary labels): i18n + English leftovers.
- Modify `lib/i18n/messages.ts`: new `costing.*` keys.
- Delete `components/costing/costing-sidebar.tsx`.
- Modify `tests/ui/costing.visual.spec.ts` (+ regenerate baselines for `/costing`).

### Task 1: Error message helper

**Files:**
- Create: `lib/costing-error-message.ts`
- Test: `lib/costing-error-message.test.ts`

**Interfaces:**
- Produces: `export function costingErrorMessage(e: unknown, fallback?: string): string`

- [ ] **Step 1: Write failing tests** in `lib/costing-error-message.test.ts`: `Error("Proyek tidak ada")` returns `"Proyek tidak ada"`; a string `"boom"` returns `"boom"`; `Error("")`, `undefined`, and `{}` return the default `"Terjadi kesalahan. Coba lagi."`; an `Error("TypeError: Failed to fetch")` (message starting with a JS error name) returns the default; a custom `fallback` argument overrides the default.
- [ ] **Step 2: Run** `npx jest lib/costing-error-message.test.ts`; expected FAIL (module missing).
- [ ] **Step 3: Implement** `costingErrorMessage` in `lib/costing-error-message.ts`: use the message when it is a non-empty string that does not match `/^\w*Error:/`, else the fallback (default above).
- [ ] **Step 4: Run** the same command; expected PASS.
- [ ] **Step 5: Commit** `feat(costing): add human error message helper`.

### Task 2: i18n keys and English leftovers

**Files:**
- Modify: `lib/i18n/messages.ts`, `components/costing/add-item-dialog.tsx`, `components/costing/new-project-dialog.tsx`, `components/costing/costing-main.tsx` (summary table labels "SELLING PRICE", "Per unit", "Total cost")
- Test: `lib/i18n/messages.test.ts` (existing parity tests)

**Interfaces:**
- Produces keys (id/en): `costing.list.title` ("Proyek costing"), `costing.list.newProject` ("Proyek baru"), `costing.list.searchPlaceholder`, `costing.list.noMatch` ("Tidak ada proyek yang cocok dengan filter."), `costing.list.resetFilters` ("Reset filter"), `costing.list.empty.title`, `costing.list.empty.description`, `costing.project.back` ("Semua proyek"), `costing.project.notFound.title` ("Proyek tidak ditemukan"), `costing.project.notFound.description`, `costing.addRow.title` ("Tambah baris item"), `costing.addRow.cancel` ("Batal"), `costing.addRow.submit` ("Tambah"), `costing.addRow.unitPrice` ("Harga satuan"), `costing.summary.sellingPrice` ("Harga jual"), `costing.summary.perUnit` ("Per unit"), `costing.summary.totalCost` ("Total biaya").

- [ ] **Step 1: Add the keys** to both `id` and `en` objects (en values are natural English; placeholders identical).
- [ ] **Step 2: Run** `npx jest lib/i18n/messages.test.ts`; expected PASS (parity, non-empty, placeholders).
- [ ] **Step 3: Switch the three components** to `t()` for the listed strings only (`useI18n` as already used in `add-item-dialog.tsx`).
- [ ] **Step 4: Run** `npm run typecheck && npm run ui:standard`; expected exit 0.
- [ ] **Step 5: Commit** `refactor(costing): move dialog and summary copy to i18n`.

### Task 3: Project list view and URL-driven routing

**Files:**
- Create: `components/costing/costing-project-list.tsx`
- Modify: `components/costing/costing-workspace.tsx`, `components/costing/costing-main.tsx`, `components/costing/use-costing-workspace.tsx`
- Delete: `components/costing/costing-sidebar.tsx`
- Test: `tests/ui/costing.visual.spec.ts`

**Interfaces:**
- Consumes: `CostingWorkspaceState` fields `projects, isLoading, search, statusFilter, monthFilter, dateFilter, availableMonths, filteredProjects, projectGroups, statusBadge, setCostingSidebar, setNewOpen, router, projectFromUrl, currentProject, loadProject`; `costingErrorMessage` (Task 1); keys from Task 2.
- Produces: `export function CostingProjectList({ ed }: { ed: CostingWorkspaceState }): JSX.Element`; `useCostingWorkspace` also returns `openProject(id: string): void` (pushes `/costing?project=${encodeURIComponent(id)}`) and `closeProject(): void` (pushes `/costing`).

- [ ] **Step 1: Rewrite the Playwright spec first** (`tests/ui/costing.visual.spec.ts`): (a) `/costing` shows h1 "Costing", heading "Proyek costing", button "Proyek baru", and a visible search field and status filter without opening a menu; (b) with the seeded project, clicking its row navigates to a URL containing `?project=` and shows a "Semua proyek" link; clicking that link returns to `/costing`; (c) `/costing?project=does-not-exist` shows "Proyek tidak ditemukan" and a link back; (d) screenshot baselines `costing-list.png` (desktop) and the same at the mobile project.
- [ ] **Step 2: Run** `npm run ui:test -- tests/ui/costing.visual.spec.ts` against the local DB; expected FAIL on (a)-(c).
- [ ] **Step 3: Implement `CostingProjectList`** reusing the existing grouping/filter state from the hook, with filters rendered inline (Select for status and month, date Input, "Reset filter" button), rows as `Link`-style buttons with name, item count badge, model/flow, status badge; loading skeleton, `EmptyState`, and no-match states per Review Focus.
- [ ] **Step 4: Implement routing** in `costing-workspace.tsx`: `projectFromUrl` empty renders the list; otherwise render `CostingMain` only when `currentProject?.id === projectFromUrl`, a skeleton while `isLoading`, and the not-found state (with `closeProject` link) when loading finished and ids differ. Add `openProject`/`closeProject` in the hook; `handleCreate` calls `openProject(newProject.id)` after success (read the id from `useCostingStore.getState().currentProject`). Keep `PageHeader` h1 in both views.
- [ ] **Step 5: Update `CostingMain`**: remove the `PanelLeftOpen` button and `sidebarCollapsed` branches (always full width, `max-w-6xl` removed), add the "Semua proyek" breadcrumb link above the project name, and replace `String(e)` toasts in files touched by this PR with `costingErrorMessage(e)`.
- [ ] **Step 6: Delete `costing-sidebar.tsx`** and its import; leave `uiWorkflowStore` sidebar fields in place (persisted state; filters still use them).
- [ ] **Step 7: Run** `npm run ui:test:update -- tests/ui/costing.visual.spec.ts` once, inspect the new PNGs for list and project views, then `npm run ui:test -- tests/ui/costing.visual.spec.ts`; expected PASS.
- [ ] **Step 8: Commit** `feat(costing): project list view and URL-driven project routing`.

### Task 4: Verification and PR

**Files:** none new.

- [ ] **Step 1: Run** `npm run lint && npm run typecheck && npm test && npm run ui:standard`; expected all exit 0.
- [ ] **Step 2: Run** the full `npm run ui:test` against the local DB; expected PASS, with only costing baselines changed.
- [ ] **Step 3: Screenshot** `/costing` and `/costing?project=<seeded id>` at desktop and mobile; walk `docs/UI-PR-CHECKLIST.md`.
- [ ] **Step 4: Open a draft PR** from `claude/project-thread-8vbwrx` with the project's PR attribution block, the screenshots, and the checklist.
