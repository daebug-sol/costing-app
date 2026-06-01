# UX acceptance scenarios — costing-app

Task-based scenarios a reviewer (or QA) walks through before merging changes
to a touched flow. Each scenario lists **trigger → expected steps → done**.
If a step cannot be executed exactly, the change is not done.

These scenarios complement, but do not replace, automated tests. They cover
the *user intent* the unit/visual tests cannot.

> Conventions:
> - "U" = the user. "A" = the app.
> - Routes use the existing App Router structure: `/`, `/costing`,
>   `/database`, `/documentation`, `/settings`.
> - Indonesian copy is used because the production audience is Indonesian.

---

## Scenario 1 — Open the app and orient

**Trigger.** U opens `/`.

1. A renders `<Navbar>` with active state on "Dashboard".
2. A renders the Dashboard `<h1>Dashboard</h1>` and the description
   "Ringkasan finansial proyek dan quotation untuk estimasi, sales, dan manajemen.".
3. A renders hero KPI strip (5 cards) then secondary KPI strip (4 tiles). On viewport
   &lt; 640px, secondary KPIs sit behind a collapsible "KPI pendukung" control (collapsed
   by default). While loading, each region keeps stable height with skeleton placeholders.
4. A renders **Insight utama** with three tabs — **Finansial**, **Penjualan**, **Costing**:
   - Finansial (default): Profit bridge + Cashflow timeline (chart ringkas; tombol
     "Lihat detail" membuka Sheet berisi chart + tabel fallback).
   - Penjualan: Quotation funnel, Status distribution, Sales leaderboard (ringkas top 5;
     "Lihat detail" untuk tabel lengkap).
   - Costing: Cost breakdown + Revenue trend (pola chart + Sheet sama).
5. A renders accordion **Detail & tindak lanjut** (collapsed by default) berisi
   Quotation aging table.
6. If the API fails, A renders the centered "Coba lagi" button **and** an
   amber strip if stale data is shown.

**Done when:** keyboard `Tab` walks through Navbar → toolbar (scope/range/refresh)
→ hero KPI strip → secondary KPI strip (atau trigger collapsible di mobile)
→ tab list (Finansial / Penjualan / Costing) → konten tab aktif + tombol "Lihat detail"
→ accordion detail → footer links,
in that order, with a visible focus ring on every stop.

---

## Scenario 2 — Drill from Dashboard into a project

**Trigger.** U has at least one costing project. From `/`:

1. U opens the "Scope" select inside dashboard toolbar.
2. A lists projects (newest first); selecting one re-fetches
   `/api/dashboard?projectId=<id>&range=<activeRange>` and updates seluruh KPI + section.
3. U mengganti range (MTD/YTD/12M/All time). A me-refetch payload dan setiap section
   berpindah periode secara konsisten tanpa full reload.
4. While re-fetching, setiap section menampilkan skeleton/placeholder stabil (bukan chart lama membeku).
5. U presses "Buka Costing".
6. A navigates to `/costing` and the workspace is preselected to the same
   project (or shows the empty state if no project context exists yet).

**Done when:** the round-trip Dashboard → Costing preserves the user's
mental model of which project they were inspecting.

---

## Scenario 3 — Edit a costing line and recalculate

**Trigger.** U is on `/costing` with at least one segment loaded.

1. U clicks an editable cell (e.g. quantity).
2. A focuses the input and selects the existing value.
3. U types a new value and either presses `Enter` or `Tab`.
4. A disables the row's save indicator (`aria-busy="true"`) and POSTs the
   change.
5. Within 250 ms (target) / 800 ms (ceiling), the row's totals update in
   place. No full-page spinner.
6. On API failure, the input keeps the user's value and a `toast.error()`
   reads "Gagal menyimpan perubahan. Coba lagi.".

**Done when:** rapid edits across multiple cells never produce stale totals
or duplicate POSTs (debounced or in-flight guarded).

---

## Scenario 4 — Add a new project / segment

**Trigger.** U opens the costing workspace with no project.

1. A renders an `<EmptyState>` with icon, title "Belum ada proyek
   costing", a one-line description, and a primary "Tambah proyek" CTA.
2. U presses "Tambah proyek".
3. A opens a `Dialog`. Focus moves to the first field. `Esc` closes the
   dialog and returns focus to the CTA.
4. U fills required fields. Empty required fields show inline
   `text-rose-600 text-xs` validation; the submit button stays disabled
   until valid.
5. On submit, the submit button shows pending; on success, the dialog
   closes, a `toast.success()` confirms creation, and the workspace renders
   the new project.

**Done when:** a screen-reader user can complete the task without ever
hearing "button" with no name (every control has an accessible name).

---

## Scenario 5 — Generate / export a quotation

**Trigger.** U is in `/documentation/quotation` for a saved project.

1. U presses "Export PDF" (or "Export Excel").
2. A disables the trigger, shows a `toast` "Menyiapkan dokumen…", and
   issues the export.
3. On success, A triggers the file download and the toast switches to
   `success` ("PDF tersimpan.").
4. On failure, A toasts `error` with a short reason; the trigger is
   re-enabled.

**Done when:** the same project exported twice produces byte-identical
output for unchanged data (export determinism — see
`costing-exports` skill).

---

## Scenario 6 — Browse and search the database

**Trigger.** U opens `/database`.

1. A renders the dual-mode database (AHU structured + custom dynamic grid).
2. In each mode, A shows a **folder → file → isi tabel** flow:
   - Panel kiri: daftar folder (buat / ubah nama / hapus kosong via `Dialog`).
   - Panel kanan: daftar file dalam folder terpilih (buka dengan Enter atau double-click).
   - Setelah file dibuka: editor tabel/grid seperti sebelumnya, dengan tombol
     "Kembali ke file".
3. Navigasi terakhir (tab aktif, folder, file) dipulihkan dari session storage
   saat U kembali ke `/database` dalam sesi yang sama.
4. While loading rows, A renders `<TableLoadingSkeleton columns={N}
   rows={5}>` matching the destination column count.
5. U types in the search input (file list atau isi tabel). Results filter without
   a full-page reload.
6. Empty filter result shows `<EmptyState>` with title "Tidak ada hasil"
   and a "Hapus filter" action that clears the query.

**Done when:** keyboard `Tab` walks folder list → file list → search (file or
table) within ≤ 5 stops from page load, and U can complete create folder →
create file → open file → edit one row without full page reload.

---

## Scenario 7 — Recover from an unexpected error

**Trigger.** U triggers any action that hits an API which returns 5xx.

1. A renders an `error` toast with an Indonesian message that **names the
   action** ("Gagal memuat dashboard.", not "Error 500").
2. A retains the user's input — no field is cleared.
3. Where retry is safe (idempotent reads, save with no side effects), A
   provides a "Coba lagi" affordance, either inline or in the toast.
4. A logs the error to the console and (when wired up) to the error tracker
   referenced in `docs/PRODUCTION-HARNESS.md`.

**Done when:** the user is never stuck on a blank screen with no path
forward.

---

## Scenario 8 — Mobile / narrow viewport

**Trigger.** U opens any route at viewport width 390 × 844.

1. The `<Navbar>` collapses to the menu button (`Menu` / `X`).
2. Tapping the menu button toggles `aria-expanded`; nav links wrap one per
   row.
3. KPI grid on the dashboard collapses to two columns (`sm:grid-cols-2`); secondary KPIs
   use collapsible on narrow viewports.
4. Insight tabs remain usable (three triggers, one panel visible); tables inside Sheet
   or accordion scroll horizontally inside their container; no horizontal
   page scroll.
5. Tap targets are ≥ 40 × 40 CSS pixels.

**Done when:** every primary task in scenarios 1–7 is still completable on
mobile (we are not mobile-first, but we are mobile-survivable).

---

## Coverage matrix

| Scenario | Dashboard | Costing | Database | Quotation | Settings |
|----------|-----------|---------|----------|-----------|----------|
| 1 Orient | x | | | | |
| 2 Drill | x | x | | | |
| 3 Edit + recalc | | x | | | |
| 4 Create | | x | x | | |
| 5 Export | | | | x | |
| 6 Search | | | x | | |
| 7 Error recovery | x | x | x | x | x |
| 8 Mobile | x | x | x | x | x |

When a PR adds a new flow, append a scenario here and add a row to the
matrix. When deleting a flow, remove the scenario rather than letting it
rot.
