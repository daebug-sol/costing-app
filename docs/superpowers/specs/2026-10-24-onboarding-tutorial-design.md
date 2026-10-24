# Tutorial onboarding: tur selamat datang + "Coba sendiri" per modul

Tujuan: user baru paham letak setiap bagian aplikasi dalam sekitar 1 menit, lalu benar-benar mencoba tiap modul di layar asli, tanpa pernah terjebak di tutorial.

## Keputusan (dae, 2026-10-24)

- Model **hybrid**: tur selamat datang singkat dengan Lewati / Lanjut, lalu tutorial "Coba sendiri" per modul di mana user melakukan aksinya sendiri.
- Paling banyak **dua tombol** di setiap kartu tutorial.
- Data yang dibuat saat praktik adalah **data asli**. Langkah terakhir menunjukkan cara menghapusnya.
- Progres disimpan **per user di database** (user berpindah antara desktop, tablet, ponsel).
- **User lama** juga melihat tur selamat datang, sekali, dan bisa langsung melewatinya.
- Pengerjaan **paralel**: satu PR fondasi, lalu enam PR modul yang tidak menyentuh file yang sama.

Keputusan ini menggantikan aturan lama "no product tour" di `docs/UI-HARNESS.md` dan `docs/UX-ACCEPTANCE-SCENARIOS.md`. Lesson Help yang sudah ada tetap dipakai apa adanya.

## Perilaku

### Kartu tutorial

Layar diredupkan, elemen target disorot (lubang di lapisan redup), dan kartu kecil (Popover) muncul di sebelahnya: penanda langkah (`2 / 7`), judul, 1 sampai 2 kalimat, tombol.

| Jenis langkah | Tombol | Maju ketika |
| --- | --- | --- |
| `info` (penjelasan) | Lewati, Lanjut (langkah terakhir: Selesai) | User menekan Lanjut |
| `action` (praktik) | Lewati, plus petunjuk "Klik yang disorot" | Event aksi terjadi atau rute berubah ke tujuan |

- Pada langkah `action`, elemen yang disorot tetap bisa diklik dan diketik. Bagian lain yang diredupkan tidak menerima klik.
- Langkah tanpa target (sambutan) tampil sebagai kartu di tengah.
- Esc sama dengan Lewati. Lewati menutup seluruh tutorial dan mencatatnya sebagai `skipped`.
- Fokus dikunci di kartu, teks langkah diumumkan lewat `aria-live`, animasi mati bila `prefers-reduced-motion`.
- Tidak pernah macet: target yang tidak muncul dalam 3 detik membuat langkah itu dilewati otomatis. Jika semua sisa langkah gagal, tutorial ditutup sebagai `done`.

### Desktop, tablet, dan ponsel (sama mulusnya)

Permintaan dae (2026-10-24): pengalaman di desktop dan mobile harus seimbang. Ketiganya dipakai sama seringnya.

- **Isi sama persis.** Langkah, urutan, teks, dan jumlah tombol sama di semua ukuran. Yang berbeda hanya target sorotan dan posisi kartu.
- **Posisi kartu.** Mulai `lg` (1024px), kartu adalah Popover di samping target, lebar maksimal 22rem. Di bawah `lg`, kartu menempel di bawah selebar layar dikurangi gutter 16px, tepat di atas bottom bar dan `safe-area-inset-bottom`, sehingga mudah dijangkau jempol.
- **Tombol.** Tinggi minimal 44px. Di bawah `lg`, Lewati (ghost, kiri) dan Lanjut (primary, kanan) berbagi lebar kartu.
- **Target per ukuran.** Menu utama memakai `nav.*` di header (mulai `lg`) dan `nav-mobile.*` di bottom bar (di bawah `lg`). Di bawah `sm` ikon Help di header disembunyikan, jadi di bawah `lg` langkah Help dan Pengaturan sama-sama menyorot tombol akun (`account.menu`), yang menu-nya berisi keduanya.
- **Scroll otomatis.** Target digulir ke area terlihat dengan memperhitungkan header (56px) dan, di bawah `lg`, bottom bar serta kartu yang menempel di bawah. Kartu tidak pernah menutupi target.
- **Keyboard di layar.** Saat input di dalam target sedang fokus di ponsel, kartu mengecil jadi satu baris petunjuk di atas layar (judul langkah dan Lewati), dan posisinya mengikuti `visualViewport` supaya tidak menutupi input maupun keyboard.
- **Dialog dan sheet.** Bila langkah `action` membuka dialog atau sheet, isi dialog itu menjadi target berikutnya. Kartu ikut pindah dan tetap berada di atas dialog.
- **Rotasi dan ubah ukuran.** Posisi dihitung ulang saat ukuran layar berubah, termasuk saat melewati batas `lg` di tengah langkah.
- **Kartu ajakan.** Mulai `lg` di pojok kanan bawah, lebar 20rem. Di bawah `lg`, menempel di atas bottom bar selebar layar.
- **Syarat selesai.** Setiap tutorial bisa diselesaikan dari awal sampai akhir di lebar 390px tanpa zoom dan tanpa scroll horizontal, dan di 768px serta 1280px dengan perilaku yang sama.

### Tur selamat datang (`welcome`)

Tampil otomatis sekali per user, pada halaman aplikasi pertama setelah masuk.

1. Sambutan (tengah): "Selamat datang, {nama}. Kenalan dulu dengan aplikasinya, cuma 1 menit."
2. Dashboard: ringkasan penjualan pribadi, target bulanan, follow-up.
3. Database: harga material, profil, komponen. Sumber harga untuk costing.
4. Costing: buat proyek, tambah item, lihat harga jual, buat penawaran.
5. Dokumentasi: penawaran sampai SO, invoice, pembayaran.
6. Help (ikon ?): panduan dan tempat mengulang tutorial.
7. Menu akun, Pengaturan: data perusahaan, kurs, tampilan. Tombol Selesai.

Tidak tampil di `/activate`, `/operator`, `/sign-in`, `/sign-up`, `/legal`, saat organisasi read-only karena demo berakhir, dan saat `AUTH_BYPASS` aktif (kecuali dipaksa, lihat Tes).

### Tutorial modul

Saat user pertama kali membuka rute modul (dan tur selamat datang sudah selesai atau dilewati), kartu ajakan kecil muncul di pojok kanan bawah tanpa meredupkan layar: "Coba buat costing pertama, 3 menit" dengan **Mulai** dan **Lewati**. Lewati mencatat `skipped` dan kartu tidak muncul lagi. Hanya satu ajakan atau tutorial aktif dalam satu waktu.

| Kunci | Rute | Langkah praktik | Izin minimum |
| --- | --- | --- | --- |
| `costing` | `/costing` | Costing baru, isi nama proyek, Tambah item > Single Item, + Tambah material, lihat price bar dan margin, Buat penawaran | `costing:write` |
| `dashboard` | `/` | Greeting dan KPI, isi target bulanan, buka satu follow-up | `dashboard:read` |
| `database` | `/database` | Buka folder Material, cari material, buka editor sel harga lalu Esc (harga tidak berubah) | `db:read` |
| `documentation` | `/documentation` | Buka satu penawaran, preview, Export PDF, progress bar O2C | `o2c:quote` |
| `customers` | `/customers` | Tambah pelanggan | `customers:write` |
| `sales-orders` | `/sales-orders` | Buka satu baris, kenali aksi utama | `o2c:order` |
| `invoices` | `/invoices` | Buka satu baris, kenali aksi utama | `o2c:invoice` |
| `payments` | `/payments` | Buka satu baris, kenali aksi utama | `o2c:payment` |
| `settings` | `/settings` | Isi nama perusahaan dan kurs USD, kenali Tampilan dan Bahasa | `settings:write` |
| `help` | `/help` | Lihat daftar tutorial dan statusnya, Ulangi | semua |

- User tanpa izin minimum tidak ditawari tutorial itu. Langkah AHU hanya ada bila modul AHU aktif.
- Kartu "Selamat datang, setup organisasi" di Pengaturan tetap ada, tetapi tombol "Buka panduan Help" diganti "Mulai tutorial" yang membuka tutorial `settings`.

### Mengulang

- Menu akun (tombol avatar, yang juga memuat Help dan Pengaturan) mendapat item "Ulangi tur selamat datang". Ikon ? tetap tautan langsung ke Help.
- Hub `/help` mendapat bagian "Tutorial interaktif": satu baris per tutorial yang boleh diakses user, status (Belum, Selesai, Dilewati) dan tombol Mulai / Ulangi. Memulai tutorial modul dari Help menavigasi ke rutenya lalu langsung memulai tanpa kartu ajakan.

## Arsitektur

### Engine (`components/tour/`, `lib/tour/`)

Engine sendiri, tanpa library tur. Dasarnya Popover dari `radix-ui` (sudah jadi dependency; komponen `components/ui/popover.tsx` ditambah lewat shadcn) dan lapisan redup dengan lubang sorotan. Alasannya: langkah "tunggu aksi user" adalah kebutuhan inti dan paling sederhana di engine sendiri, dan gaya kartu langsung memakai token semantik.

- `TourProvider` dipasang di `AppShell` (`components/app-providers.tsx`). Ia memuat progres, menentukan apa yang tampil di rute saat ini, dan merender overlay.
- `useTour()` memberi `start(key)`, `skip()`, `next()`, status aktif.
- `tourEvent(name)` dari `lib/tour/events.ts`: fungsi biasa (bisa dipanggil di luar React) yang memancarkan event ke engine. Tidak berbuat apa-apa bila tidak ada tutorial aktif.

### Kontrak data

```ts
// lib/tour/types.ts
export type TourKey =
  | "welcome" | "costing" | "dashboard" | "database" | "documentation"
  | "customers" | "sales-orders" | "invoices" | "payments" | "settings" | "help";

export type Localized = { id: string; en: string };

export type TourStep = {
  id: string;
  kind: "info" | "action";
  /** Nilai atribut data-tour pada elemen target; kosong = kartu di tengah. */
  target?: string;
  /** Target lain di bawah lg (mis. item bottom bar). */
  targetMobile?: string;
  title: Localized;
  body: Localized;
  /** Langkah action: maju saat event ini dipancarkan... */
  advanceOn?: string;
  /** ...atau saat pathname cocok dengan prefix ini. */
  advanceOnRoute?: string;
  /** Langkah hanya ada bila predikat ini benar (mis. modul AHU aktif). */
  when?: (ctx: TourContext) => boolean;
};

export type TourDefinition = {
  key: TourKey;
  /** Rute yang memicu kartu ajakan; welcome tidak punya. */
  route?: string;
  permission?: Permission;
  invite?: { title: Localized; minutes: number };
  steps: TourStep[];
};
```

- Satu file per tutorial di `content/tutorials/<key>.ts` (O2C: satu file `o2c.ts` mengekspor empat definisi), teks ID dan EN di file yang sama seperti katalog Help. Bukan di `lib/i18n/messages.ts`.
- `content/tutorials/index.ts` mendaftar semua definisi dan dibuat lengkap oleh PR 0, sehingga PR modul tidak mengubahnya.
- Teks tombol engine (Lewati, Lanjut, Selesai, Mulai, petunjuk) ada di `lib/i18n/messages.ts`, ditambah oleh PR 0 saja.

### Penamaan

- Atribut target: `data-tour="<modul>.<elemen>"`, mis. `costing.new-project`, `nav.costing`, `nav-mobile.costing`.
- Event aksi: `<modul>.<kejadian-lampau>`, mis. `costing.project-created`, `database.cell-editor-opened`. Dipanggil dari handler sukses yang sudah ada, satu baris, tanpa mengubah perilaku.
- Menambah atribut `data-tour` dan panggilan `tourEvent` adalah satu-satunya perubahan di komponen modul. Tidak ada perubahan gaya.

### Progres

```prisma
model TutorialProgress {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String
  tutorialKey    String
  status         String       // "done" | "skipped"
  updatedAt      DateTime     @updatedAt

  @@unique([organizationId, userId, tutorialKey])
  @@index([organizationId, userId])
}
```

- `GET /api/tutorials` mengembalikan `{ progress: Record<TourKey, "done" | "skipped"> }` milik user yang memanggil di organisasi aktif.
- `PUT /api/tutorials` dengan `{ key, status }` (status `null` menghapus baris, untuk Ulangi). Kunci divalidasi terhadap `TourKey`, pola guard sama dengan `app/api/me/target/route.ts`, tidak butuh izin khusus selain anggota organisasi, selalu di-scope `organizationId` + `userId`.
- Klien menyimpan cermin di `localStorage` (`costing-tour-progress`) supaya tidak berkedip saat memuat. Server tetap sumber kebenaran.
- Masuk ke tes isolasi tenant (`app/api/tenant-isolation.test.ts`).

## Tes

- Unit (jest) untuk engine: Lanjut, Lewati, Esc, maju lewat event, maju lewat rute, target hilang dilewati setelah 3 detik, `when` menyaring langkah, izin menyaring ajakan.
- Unit untuk API: validasi kunci, scoping per user dan organisasi.
- Playwright: parameter `?tour=<key>` memaksa tutorial tampil walau `AUTH_BYPASS` aktif. Tiap PR (termasuk PR 0 untuk tur selamat datang) menjalankan tutorialnya dari awal sampai Selesai di 1280 (desktop), 768 (tablet), dan 390 (ponsel), dan menyimpan screenshot langkah kunci di ketiga ukuran, terang dan gelap. Snapshot visual yang ada tidak berubah karena tutorial tidak tampil tanpa parameter itu.

## Pembagian PR

PR 0 harus merge lebih dulu. Setelah itu PR A sampai F dikerjakan bersamaan dan boleh merge dalam urutan apa pun.

| PR | Isi | File |
| --- | --- | --- |
| 0 Fondasi | Engine, Popover, model + migrasi + API, `content/tutorials/` lengkap dengan kerangka (`steps: []` untuk modul, isi penuh untuk `welcome`), target `nav.*` di Navbar dan bottom bar, item "Ulangi tur selamat datang" di menu akun, teks tombol di i18n, update dokumen aturan | `components/tour/`, `lib/tour/`, `components/ui/popover.tsx`, `prisma/`, `app/api/tutorials/`, `content/tutorials/`, `components/Navbar.tsx`, `components/bottom-nav.tsx`, `components/app-providers.tsx`, `lib/i18n/messages.ts`, `docs/` |
| A Costing | Tutorial `costing` | `components/costing/`, `content/tutorials/costing.ts`, `tests/` file sendiri |
| B Dashboard | Tutorial `dashboard` | `components/dashboard/`, `content/tutorials/dashboard.ts`, `tests/` file sendiri |
| C Database | Tutorial `database` | `components/database/`, `content/tutorials/database.ts`, `tests/` file sendiri |
| D Dokumentasi | Tutorial `documentation` | `components/documentation/`, `content/tutorials/documentation.ts`, `tests/` file sendiri |
| E O2C | Tutorial `customers`, `sales-orders`, `invoices`, `payments` | `components/customers/`, `components/sales-orders/`, `components/invoices/`, `components/payments/`, `content/tutorials/o2c.ts`, `tests/` file sendiri |
| F Pengaturan + Help | Tutorial `settings` dan `help`, tombol Mulai tutorial di kartu onboarding, bagian "Tutorial interaktif" di hub Help | `components/settings/`, `components/help/`, `content/tutorials/settings.ts`, `content/tutorials/help.ts`, `tests/` file sendiri |

PR modul hanya mengisi file konten miliknya dan menambah atribut serta event di komponennya. Bila sebuah PR modul butuh perubahan engine, perubahan itu dikirim sebagai PR kecil terpisah ke fondasi, bukan di PR modul.

## Di luar cakupan

- Video, GIF, atau checklist "langkah memulai" di dashboard.
- Analitik pemakaian tutorial.
- Tutorial untuk halaman operator dan aktivasi.

## Prasyarat rilis

- Migrasi `TutorialProgress` dijalankan di production (`npm run db:migrate`) bersama deploy PR 0.
