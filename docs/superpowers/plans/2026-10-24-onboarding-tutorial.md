# Tutorial onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tur selamat datang (Lewati / Lanjut) plus tutorial "Coba sendiri" per modul, dengan progres per user di database, sama mulusnya di desktop, tablet, dan ponsel.

**Architecture:** Inti engine adalah state machine murni (`lib/tour/machine.ts`) yang dites dengan jest. Lapisan React (`components/tour/`) mencari target `data-tour`, menggambar sorotan, dan merender kartu (Popover mulai `lg`, kartu menempel di bawah `lg`). Definisi tutorial adalah data di `content/tutorials/`. Komponen modul hanya menambah atribut `data-tour` dan memanggil `tourEvent()`.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, `radix-ui` Popover (lewat shadcn), Prisma 7, jest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-24-onboarding-tutorial-design.md`

## Global Constraints

- Paling banyak dua tombol per kartu. `info`: Lewati + Lanjut (akhir: Selesai). `action`: Lewati + petunjuk. Ajakan: Mulai + Lewati.
- Teks tutorial ada di `content/tutorials/<key>.ts` sebagai `{ id, en }`. Hanya teks tombol engine di `lib/i18n/messages.ts`, dan hanya PR 0 yang mengubah file itu.
- Penamaan target `data-tour="<modul>.<elemen>"`, event `<modul>.<kejadian-lampau>`.
- Breakpoint: mulai `lg` (1024px) Popover di samping target, max 22rem; di bawah `lg` kartu menempel di atas bottom bar, gutter 16px, plus `safe-area-inset-bottom`. Tombol tinggi minimal 44px.
- Target hilang 3 detik: langkah dilewati. Esc = Lewati.
- localStorage mirror: `costing-tour-progress`. Parameter paksa: `?tour=<key>`.
- Tidak tampil di `/activate`, `/operator`, `/sign-in`, `/sign-up`, `/legal`. Tanpa `?tour=`, tidak tampil saat `AUTH_BYPASS` (Playwright) supaya snapshot lama tetap sama.
- Semua query `TutorialProgress` di-scope `organizationId` + `userId`.
- Aturan repo: komponen `components/ui/*`, token semantik (tanpa hex), ikon lucide, `aria-label` di tombol ikon, tanpa restyle di luar tugas, tidak menyentuh `lib/calculations/**`, `lib/ahu-*.ts`, `lib/project-rollup.ts`.
- Verifikasi tiap PR: `npm run lint`, `npm run typecheck`, `npm test`, `npm run ui:standard`, Playwright tutorialnya di 1280, 768, 390, screenshot terang dan gelap.

## Review Focus

1. Tutorial berjalan saat data user kosong (belum ada proyek, follow-up, invoice): langkah yang targetnya tidak ada dilewati, tutorial tidak macet. Tes: `machine` "skips a step whose target is missing" dan tiap spec Playwright modul dijalankan di org seed.
2. Ganti ukuran layar melewati `lg` di tengah langkah: target pindah dari `nav.*` ke `nav-mobile.*` tanpa menutup tutorial. Tes di Task 6 (`tour-welcome.spec.ts` "survives resize across lg").
3. User berpindah halaman sendiri di tengah tutorial (klik menu lain): tutorial tetap di langkahnya; bila target tidak ada di halaman baru, langkah dilewati sesuai aturan 3 detik, bukan error. Tes: `machine` "target-missing on route change".
4. Gagal simpan progres (offline, 500): tutorial tetap tertutup di sesi itu lewat mirror localStorage dan tidak muncul ulang setelah reload. Tes: `progress-client` "keeps local status when PUT fails".
5. Dua tab terbuka: tur selamat datang tidak tampil dua kali setelah salah satunya selesai dan tab lain di-reload. Tercakup oleh GET server sebagai sumber kebenaran; tes API "returns saved status".

---

## PR 0: Fondasi

Branch `claude/project-thread-jvrgvv`. Dikerjakan berurutan, Task 1 sampai 7.

### Task 1: Tipe dan registry

**Files:**
- Create: `lib/tour/types.ts`, `content/tutorials/index.ts`, `content/tutorials/{welcome,costing,dashboard,database,documentation,o2c,settings,help}.ts`
- Test: `tests/tour-registry.test.ts`

**Interfaces:**
- Produces: tipe `TourKey`, `Localized`, `TourStep`, `TourDefinition`, `TourContext` persis seperti di spec, dengan `TourContext = { permissions: Permission[]; modules: { ahu: boolean }; isDesktop: boolean }`. `TOUR_KEYS: readonly TourKey[]`. `TUTORIALS: Record<TourKey, TourDefinition>` dan `tutorialForRoute(pathname: string): TourDefinition | null` di `content/tutorials/index.ts`.
- File modul berisi definisi lengkap (key, route, permission, invite) dengan `steps: []`. Route dan permission dari tabel spec. `o2c.ts` mengekspor `customersTour`, `salesOrdersTour`, `invoicesTour`, `paymentsTour`.

- [ ] **Step 1: Tes gagal** `tests/tour-registry.test.ts`: setiap `TOUR_KEYS` punya definisi dengan `key` sama; id langkah unik per tutorial; setiap definisi selain `welcome` punya `route`, `permission`, `invite.minutes > 0`; setiap `Localized` punya `id` dan `en` tidak kosong; `tutorialForRoute("/costing")?.key === "costing"`, `tutorialForRoute("/costing/abc")?.key === "costing"`, `tutorialForRoute("/")?.key === "dashboard"`, `tutorialForRoute("/operator") === null`.
- [ ] **Step 2:** `npx jest tests/tour-registry.test.ts`, gagal karena modul belum ada.
- [ ] **Step 3:** Tulis tipe dan file konten. `welcome.ts` diisi pada Task 6; di sini `steps: []`. `tutorialForRoute` mencocokkan `/` secara persis dan rute lain secara prefix.
- [ ] **Step 4:** Tes lulus.
- [ ] **Step 5:** Commit `feat(tour): tipe dan registry tutorial`.

### Task 2: State machine

**Files:**
- Create: `lib/tour/machine.ts`
- Test: `tests/tour-machine.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `type TourState = { status: "idle" } | { status: "invite"; key: TourKey } | { status: "running"; key: TourKey; steps: TourStep[]; index: number }`
  - `type TourAction = { type: "invite"; key } | { type: "start"; key; ctx: TourContext } | { type: "next" } | { type: "skip" } | { type: "event"; name: string } | { type: "route"; pathname: string } | { type: "target-missing" }`
  - `type TourEffect = { save: { key: TourKey; status: "done" | "skipped" } } | null`
  - `tourReducer(state, action): { state: TourState; effect: TourEffect }`
  - `visibleSteps(def: TourDefinition, ctx: TourContext): TourStep[]` (menyaring `when`)
  - `pickAutoTour(args: { pathname: string; progress: Partial<Record<TourKey, "done" | "skipped">>; ctx: TourContext; forced: TourKey | null }): { kind: "run" | "invite"; key: TourKey } | null`

- [ ] **Step 1: Tes gagal**, satu `it` per perilaku:
  - "next advances info steps and the last next saves done"
  - "next is ignored on action steps"
  - "event advances only the matching action step"
  - "route advances when pathname starts with advanceOnRoute"
  - "skip saves skipped from invite and from running"
  - "skips a step whose target is missing; missing on the last step saves done"
  - "target-missing on route change keeps the tour running at the next step"
  - "start with zero visible steps stays idle and saves nothing"
  - `pickAutoTour`: excluded routes return null; `welcome` unseen returns `{kind:"run",key:"welcome"}` on any app route; after welcome done, an unseen module tour with steps returns `invite`; a module tour with `steps: []` returns null; missing permission returns null; `forced` returns `run` for that key even when progress says done.
- [ ] **Step 2:** Tes gagal.
- [ ] **Step 3:** Implementasi murni, tanpa React dan tanpa DOM.
- [ ] **Step 4:** Tes lulus.
- [ ] **Step 5:** Commit `feat(tour): state machine tutorial`.

### Task 3: Event bus

**Files:**
- Create: `lib/tour/events.ts`
- Test: `tests/tour-events.test.ts`

**Interfaces:**
- Produces: `tourEvent(name: string): void`, `subscribeTourEvents(fn: (name: string) => void): () => void`. Tanpa subscriber, `tourEvent` tidak berbuat apa-apa dan tidak melempar error. Aman dipanggil di server (no-op bila `window` tidak ada).

- [ ] **Step 1:** Tes: subscriber menerima nama event; unsubscribe berhenti menerima; `tourEvent` tanpa subscriber tidak melempar.
- [ ] **Step 2–4:** Gagal, implementasi (Set listener di modul), lulus.
- [ ] **Step 5:** Commit `feat(tour): event bus`.

### Task 4: Progres di database

**Files:**
- Modify: `prisma/schema.prisma` (model `TutorialProgress` dari spec, relasi `tutorialProgress TutorialProgress[]` di `Organization`)
- Create: `prisma/migrations/20261024020000_tutorial_progress/migration.sql`, `app/api/tutorials/route.ts`, `lib/tour/progress-client.ts`
- Test: `app/api/tutorials/route.test.ts`, `tests/tour-progress-client.test.ts`, tambah kasus di `app/api/tenant-isolation.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/tutorials` → `{ progress: Partial<Record<TourKey, "done" | "skipped">>, displayName: string | null }`
  - `PUT /api/tutorials` body `{ key: TourKey, status: "done" | "skipped" | null }` → `{ ok: true }`; 400 untuk key tidak dikenal atau status salah.
  - `loadProgress(): Promise<Progress>`, `saveProgress(key, status): Promise<void>`, `readLocalProgress(): Progress` di `lib/tour/progress-client.ts`, dengan `Progress = Partial<Record<TourKey, "done" | "skipped">>`.

- [ ] **Step 1: Tes gagal** (mock prisma dan `guardApiRoute` seperti `app/api/me/target`):
  - "GET returns saved status for the caller only" (cek `where` berisi `organizationId` dan `userId` dari guard)
  - "PUT upserts by organizationId_userId_tutorialKey"
  - "PUT null deletes the row"
  - "PUT rejects unknown key with 400"
  - tenant-isolation: "tutorials GET scopes to the active org and user"
  - progress-client: "keeps local status when PUT fails" (fetch mock 500, `readLocalProgress()` tetap berisi status), "loadProgress merges server over local".
- [ ] **Step 2:** Tes gagal.
- [ ] **Step 3:** Model, migrasi SQL (tabel, unique, index, FK cascade), route, client. `saveProgress` menulis localStorage dulu, lalu PUT, dan tidak melempar bila gagal.
- [ ] **Step 4:** `npx prisma validate`, tes lulus.
- [ ] **Step 5:** Commit `feat(tour): simpan progres tutorial per user`.

### Task 5: Lapisan UI engine

**Files:**
- Create: `components/ui/popover.tsx` (lewat skill shadcn), `components/tour/tour-provider.tsx`, `components/tour/use-tour-target.ts`, `components/tour/tour-spotlight.tsx`, `components/tour/tour-card.tsx`, `components/tour/tour-invite.tsx`
- Modify: `components/app-providers.tsx` (bungkus isi `AppShell` dengan `TourProvider`), `lib/i18n/messages.ts`
- Test: `tests/ui/tour-engine.spec.ts` (memakai tutorial uji `?tour=welcome` setelah Task 6, jadi dijalankan di akhir Task 6)

**Interfaces:**
- Consumes: Task 1 sampai 4, `useCostingStore` (`permissions`, `modules.ahu`), `useI18n` (`locale`, `t`).
- Produces: `useTour(): { state: TourState; start(key: TourKey): void; skip(): void; next(): void }`. Komponen lain memulai tutorial dengan `start(key)`; Help hub (PR F) memakai ini.
- Kunci i18n baru (ID / EN): `tour.skip` Lewati / Skip, `tour.next` Lanjut / Next, `tour.done` Selesai / Done, `tour.start` Mulai / Start, `tour.actionHint` Klik yang disorot untuk lanjut / Click the highlighted item to continue, `tour.stepOf` {current} / {total}, `tour.replayWelcome` Ulangi tur selamat datang / Replay welcome tour, `tour.inviteMinutes` {minutes} menit / {minutes} min.

Perilaku yang ditetapkan spec dan harus ada:
- `use-tour-target(step, isDesktop)`: pilih `targetMobile ?? target` di bawah `lg`, cari `[data-tour="…"]` yang terlihat, tunggu dengan MutationObserver sampai 3 detik lalu kirim `target-missing`, `scrollIntoView` dengan offset header 56px dan (di bawah `lg`) bottom bar 56px + tinggi kartu, ukur ulang dengan ResizeObserver dan `resize`. `isDesktop` dari `matchMedia("(min-width: 1024px)")`.
- `tour-spotlight`: lapisan `fixed inset-0` dengan lubang di posisi target (box-shadow besar dengan warna token overlay), menangkap klik di luar lubang; di dalam lubang klik diteruskan ke target. Tanpa animasi bila `prefers-reduced-motion`.
- `tour-card`: mulai `lg` Popover beranchor ke target (tanpa target: di tengah); di bawah `lg` kartu `fixed` di atas bottom bar. Mode ringkas satu baris di atas layar saat elemen input di dalam target fokus dan `visualViewport.height` < `window.innerHeight`. `role="dialog"`, fokus terkunci, `aria-live="polite"` untuk teks, Esc memanggil `skip()`.
- `tour-provider`: muat progres, panggil `pickAutoTour` setiap pathname berubah, `?tour=<key>` sebagai `forced`, subscribe ke event bus, kirim action `route` saat pathname berubah, jalankan `effect.save` lewat `saveProgress`. Tidak memuat apa pun saat GET gagal (organisasi demo berakhir ditolak API, jadi tidak tampil).

- [ ] **Step 1:** Tambah Popover lewat shadcn, kunci i18n, komponen di atas.
- [ ] **Step 2:** `npm run typecheck && npm run lint && npm run ui:standard` lulus.
- [ ] **Step 3:** Commit `feat(tour): overlay, kartu, dan provider tutorial`.

### Task 6: Tur selamat datang dan menu akun

**Files:**
- Modify: `content/tutorials/welcome.ts`, `components/Navbar.tsx`, `components/bottom-nav.tsx`
- Test: `tests/ui/tour-welcome.spec.ts`, `tests/ui/tour-engine.spec.ts`

**Interfaces:**
- Target baru: `nav.dashboard`, `nav.database`, `nav.costing`, `nav.documentation` (link header), `nav-mobile.dashboard`, `nav-mobile.database`, `nav-mobile.costing`, `nav-mobile.documentation` (bottom bar), `nav.help` (ikon ?), `account.menu` (pembungkus `UserButton`; tanpa Clerk, tombol Pengaturan).
- Langkah welcome (semua `info`): `hello` (tanpa target, teks memakai `{name}` dari `displayName`, fallback tanpa nama), `dashboard`, `database`, `costing`, `documentation` (target `nav.*`, `targetMobile` `nav-mobile.*`), `help` (target `nav.help`, `targetMobile` `account.menu`), `settings` (target `account.menu`). Teks dari spec.
- Menu akun: `UserButton.Action` dengan label `t("tour.replayWelcome")` yang memanggil `start("welcome")`.

- [ ] **Step 1: Tes gagal** `tour-welcome.spec.ts`, diulang untuk viewport 1280×800, 768×1024, 390×844:
  - "runs welcome to the end with Lanjut": buka `/?tour=welcome`, kartu menampilkan `1 / 7`, klik Lanjut 6 kali, klik Selesai, kartu hilang.
  - "skip closes and Esc closes"
  - "highlights bottom bar below lg and header links from lg" (cek kotak sorotan berimpit dengan `[data-tour=nav-mobile.costing]` atau `[data-tour=nav.costing]`)
  - "survives resize across lg": mulai di 1280, di langkah 4 ubah ke 390, kartu tetap `4 / 7` dan menyorot `nav-mobile.costing`
  - "no horizontal scroll at 390": `document.documentElement.scrollWidth <= 390` di setiap langkah
  - screenshot langkah 1 dan 4 di ketiga ukuran, terang dan gelap.
  - `tour-engine.spec.ts`: "no tour without ?tour under AUTH_BYPASS" (buka `/`, tidak ada `[role=dialog][data-tour-card]`).
- [ ] **Step 2:** Tes gagal (DB lokal sesuai CLAUDE.md: `npm run db:up`, migrate, seed).
- [ ] **Step 3:** Isi `welcome.ts`, tambah atribut dan item menu.
- [ ] **Step 4:** `npx playwright test tests/ui/tour-welcome.spec.ts tests/ui/tour-engine.spec.ts` lulus, dan `npm run ui:test` lain tetap lulus tanpa update snapshot.
- [ ] **Step 5:** Commit `feat(tour): tur selamat datang`.

### Task 7: Dokumen aturan dan PR

**Files:**
- Modify: `docs/UI-HARNESS.md` (paragraf Help: hapus "no product tour", tambah paragraf "Tutorial" yang merangkum aturan dua tombol, `data-tour`, `tourEvent`, breakpoint), `docs/UX-ACCEPTANCE-SCENARIOS.md` (hapus syarat "no interactive tour", tambah skenario tur selamat datang), `docs/UI-PR-CHECKLIST.md` (butir: elemen baru yang dipakai tutorial punya `data-tour`)

- [ ] **Step 1:** Ubah dokumen.
- [ ] **Step 2:** `npm run lint && npm run typecheck && npm test && npm run ui:standard` lulus.
- [ ] **Step 3:** Screenshot tur di 1280 / 768 / 390 terang dan gelap ke `/mnt/project-files/costing-revamp/onboarding-tour/`.
- [ ] **Step 4:** Commit, push, buka PR 0 dengan catatan migrasi production.

---

## PR A sampai F: tutorial modul (paralel setelah PR 0 merge)

Setiap PR berangkat dari `master` setelah PR 0 merge, di worktree dan branch sendiri. Setiap PR:

1. Mengisi `steps` di file kontennya sendiri saja.
2. Menambah `data-tour` dan `tourEvent()` di komponen modulnya sendiri saja (satu baris di handler sukses yang sudah ada, tanpa mengubah perilaku atau gaya).
3. Menulis `tests/ui/tour-<key>.spec.ts` yang menjalankan tutorial dari `/<route>?tour=<key>` sampai Selesai di 1280, 768, 390, termasuk asersi "no horizontal scroll at 390", dan menyimpan screenshot langkah kunci terang dan gelap ke `/mnt/project-files/costing-revamp/onboarding-tour/<key>/`.
4. Lulus lint, typecheck, test, ui:standard, dan `npm run ui:test` lain tanpa update snapshot.
5. Bila butuh perubahan engine, berhenti dan laporkan; jangan ubah `lib/tour/` atau `components/tour/` di PR modul.

Nama target dan event di bawah adalah kontrak. Implementer memilih elemen yang tepat di komponennya.

### Task A: Costing (`content/tutorials/costing.ts`, `components/costing/`)

Langkah: `new-project` action target `costing.new-project`, advanceOn `costing.new-project-dialog-opened` · `name` action target `costing.new-project-dialog`, advanceOnRoute `/costing/` (proyek dibuat dan dibuka) · `add-item` action target `costing.add-item`, advanceOn `costing.add-item-menu-opened` · `single-item` action target `costing.add-item.single`, advanceOn `costing.item-added` · `add-material` action target `costing.add-material`, advanceOn `costing.material-added` · `price` info target `costing.price-bar` · `margins` info target `costing.margins` · `quote` action target `costing.create-quote`, advanceOn `costing.quote-created`, langkah terakhir menjelaskan cara menghapus proyek latihan (menu ⋯ proyek). Langkah yang menyebut AHU memakai `when: ctx => ctx.modules.ahu`.

### Task B: Dashboard (`content/tutorials/dashboard.ts`, `components/dashboard/`)

`greeting` info target `dashboard.greeting` · `kpi` info target `dashboard.kpi` · `target` action target `dashboard.target`, advanceOn `dashboard.target-saved` · `follow-up` action target `dashboard.follow-up`, advanceOnRoute ke rute tujuan follow-up yang ada (implementer memakai prefix rute yang dibuka baris itu).

### Task C: Database (`content/tutorials/database.ts`, `components/database/`)

`folder` action target `database.folder.material`, advanceOn `database.folder-opened` · `search` action target `database.search`, advanceOn `database.searched` · `edit` action target `database.price-cell`, advanceOn `database.cell-editor-opened` · `cancel` info target `database.price-cell`, teks: tekan Esc untuk batal, harga tidak berubah · `save-state` info target `database.save-state`.

### Task D: Dokumentasi (`content/tutorials/documentation.ts`, `components/documentation/`)

`open` action target `documentation.quote-row`, advanceOn `documentation.quote-opened` · `preview` info target `documentation.preview` · `export` action target `documentation.export-pdf`, advanceOn `documentation.pdf-exported` · `o2c` info target `documentation.o2c-progress`.

### Task E: O2C (`content/tutorials/o2c.ts`, `components/customers/`, `components/sales-orders/`, `components/invoices/`, `components/payments/`)

- `customers`: `add` action target `customers.add`, advanceOn `customers.dialog-opened` · `save` action target `customers.dialog`, advanceOn `customers.created` · `row` info target `customers.row`.
- `sales-orders`, `invoices`, `payments` (pola sama, `<m>` = nama modul): `row` action target `<m>.row`, advanceOn `<m>.opened` · `primary` info target `<m>.primary-action`.

### Task F: Pengaturan dan Help (`content/tutorials/{settings,help}.ts`, `components/settings/`, `components/help/`)

- `settings`: `company` action target `settings.company-name`, advanceOn `settings.company-saved` · `forex` action target `settings.forex-usd`, advanceOn `settings.forex-saved` · `appearance` info target `settings.appearance`.
- Kartu onboarding Pengaturan: tombol "Buka panduan Help" diganti `t("tour.start")` yang memanggil `useTour().start("settings")` (kunci i18n `settings.onboarding.openHelp` dibiarkan, tidak dipakai lagi; hapus di PR ini hanya bila tidak dipakai di tempat lain).
- Hub Help: bagian "Tutorial interaktif" (`data-testid="help-tutorials"`) dengan satu baris per tutorial yang lolos izin, status Belum / Selesai / Dilewati dari `readLocalProgress()` yang disegarkan `loadProgress()`, tombol Mulai / Ulangi: `saveProgress(key, null)` lalu `router.push(route + "?tour=" + key)`. Teks bagian ini tinggal di `content/tutorials/help.ts` (ekspor `helpTutorialsCopy`), bukan di `messages.ts`.
- `help`: `list` info target `help.tutorials` · `replay` info target `help.tutorials.replay`.
