import type { HelpLesson } from "../types";

export const proyekDanSegment: HelpLesson = {
  track: "costing",
  slug: "proyek-dan-segment",
  title: "Proyek dan segment",
  summary:
    "Buat proyek costing baru, lalu tambah segment AHU untuk mulai mengisi perhitungan.",
  durationMin: 7,
  relatedRoutes: ["/costing"],
  steps: [
    {
      title: "Buka Costing",
      body: "Workspace Costing menampilkan daftar proyek di sisi kiri dan editor segment di kanan. Mulai dari daftar kosong dengan menambahkan proyek.",
      deepLink: "/costing",
      demoId: "create-project",
      uiHint: "Navbar → Costing",
    },
    {
      title: "Proyek baru",
      body: "Tekan Proyek baru, isi nama dan metadata dasar, lalu simpan. Proyek baru muncul di daftar dan siap menerima segment.",
      demoId: "create-project",
      uiHint: "Tombol Proyek baru",
    },
    {
      title: "Tambah segment",
      body: "Di dalam proyek, tambah segment AHU (misalnya cooling atau fan). Setiap segment punya grid perhitungan sendiri.",
      deepLink: "/costing",
      uiHint: "Panel proyek → Tambah segment",
    },
  ],
  tips: [
    "Kelompokkan segment sesuai unit AHU di lapangan agar rollup proyek mudah dibaca di Dashboard.",
  ],
};
