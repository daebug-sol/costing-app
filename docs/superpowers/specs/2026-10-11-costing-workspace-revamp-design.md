# Costing workspace revamp: design spec (draft for review)

Status: approved by dae on 2026-10-11. Implementation follows docs/superpowers/plans/2026-10-11-costing-pr1-project-list.md (PR 1 only).
Scope: full restructure of `/costing`. UI only: no changes to `lib/calculations/**`, `lib/ahu-*.ts`, `lib/project-rollup.ts`, the Prisma schema or the API. Same data hook (`use-costing-workspace`).

## Goal
A user can open a project, add items, see the live selling price at all times, and finish with a quotation, without hunting.

## Decisions already made
- Full restructure (not the small fix set).
- Items are edited in a **side panel**, one at a time, with the items list still visible.

## 1. Navigation
- `/costing` = **project list**, full width: search, visible status and month filters, "Proyek baru" as the primary button. Replaces the left sidebar and its collapse state.
- A project opens at `/costing?project=<id>` (deep-linkable, keeps Dashboard "Buka Costing" working). Breadcrumb "Semua proyek › <name>" returns to the list.
- Item selection is in the URL too (`&item=<segmentId>`) so refresh and back button keep the user's place.

## 2. Project workspace layout (desktop)
```
[ breadcrumb ]                      [ status ] [ Buat penawaran ]
[ name · Qty penawaran ]  [ HPP | Total cost | Harga jual | Per unit ]  <- sticky
+-------------------------+----------------------------------------+
| Items list (compact)    | Item editor (side panel)               |
| badge · name · subtotal | manual rows  OR  AHU tabs              |
| [+ Tambah item]         |                                        |
| Biaya tambahan & margin |                                        |
+-------------------------+----------------------------------------+
```
- Items list: type badge, title, subtotal, drag handle (existing dnd-kit ordering kept), delete via AlertDialog. Selected item highlighted.
- Margins and surcharges (overhead, kontinjensi, eskalasi, asuransi, mobilisasi, margin) become a panel under the list, always reachable, with a visible "Menyimpan… / Tersimpan / Gagal, coba lagi" state per save.
- Sticky price strip replaces the collapsed "Ringkasan biaya proyek" as the always-visible number; the full breakdown stays available on demand.
- Mobile (<lg): list full width; selecting an item opens the editor as a full-screen Sheet; price strip stays sticky.

## 3. Add item
- A labeled primary button "Tambah item" with three choices: Item manual, Item grup, AHU otomatis (only if the AHU module is enabled). Remove the `document.querySelector` click-through in the empty state.
- One vocabulary: **item** = a row in the list (today's segment); **baris** = a line inside an item; **grup** = a group of lines.

## 4. Finish line
- Status shown as Draft → Final → Penawaran.
- "Finalkan proyek" opens an AlertDialog naming the project and stating what finalizing does. "Buat penawaran" becomes the primary action once final; before that it is secondary with a hint.
- (To confirm during planning: whether finalized projects are actually locked today. If not, copy says only what is true.)

## 5. AHU editor
- Tabs numbered by order of work: 1 Unit & hitung, 2 Parameter modul, 3 Ringkasan.
- A "Perlu hitung ulang" indicator when params are saved but totals are stale, with the recalculate button next to it. No change to when or how recalculation runs.

## 6. Cross-cutting
- All new strings through `lib/i18n` (ID/EN); remove English leftovers ("Cancel", "Add", "Unit price", "SELLING PRICE").
- Replace `showToast(String(e))` with a human Indonesian message and "Coba lagi" where retryable.
- Follow `docs/UI-HARNESS.md`: shadcn primitives, semantic tokens, lucide icons, aria-labels, loading/empty/error states, one `<h1>`.
- Reduce page chrome: drop the "Workspace" band header on the project view so the editing area gets the height.

## 7. Delivery (3 PRs, UI-HARNESS §8 cadence)
1. **Project list + routing + copy**: new `/costing` list, `?project=` routing, vocabulary and i18n fixes. Sidebar removed.
2. **Project workspace**: sticky price strip, items list, margins panel, add-item menu, status/finalize flow, side panel container (manual and AHU editors mounted unchanged inside it).
3. **Editor polish**: AHU tab order and stale indicator, manual editor cleanup, mobile Sheet, a11y pass, Playwright baselines updated.

## 8. Testing
- Jest for any new pure helpers (URL state, save-state hook).
- Update `tests/ui/costing.visual.spec.ts` and `editors.stateful.spec.ts`; screenshots desktop + mobile per PR; `npm run lint`, `typecheck`, `test`, `ui:standard` before each PR.

## 9. Risks / open points
- `ManualWorkspace.tsx` (1,312 lines) and `use-costing-workspace.tsx` (648) are large; PR 2 mounts them in the panel without rewriting, deeper cleanup is PR 3 only if needed.
- Per-segment open/collapsed state in `store/uiWorkflowStore.ts` becomes mostly obsolete; keep until PR 3 to avoid breaking persisted state.
- Existing Playwright baselines will change intentionally.
- Dashboard drill-down (`Buka Costing` with preselected project) must keep working via `?project=`.
