import type { HelpLesson } from "../types";

export const editSelCosting: HelpLesson = {
  track: "costing",
  slug: "edit-sel-costing",
  title: "Edit sel dan hitung ulang",
  summary:
    "Ubah nilai di grid costing; aplikasi menghitung ulang total secara otomatis.",
  durationMin: 5,
  relatedRoutes: ["/costing"],
  steps: [
    {
      title: "Pilih proyek dan segment",
      body: "Buka proyek di daftar kiri, lalu pilih segment yang akan diedit. Grid menampilkan baris biaya dan formula terkait.",
      deepLink: "/costing",
      demoId: "edit-cell",
    },
    {
      title: "Edit sel",
      body: "Klik sel yang bisa diedit, ketik angka baru, lalu keluar dari sel (Tab atau klik di luar). Validasi angka muncul inline jika nilai tidak valid.",
      demoId: "edit-cell",
      uiHint: "Grid costing → sel input",
    },
    {
      title: "Periksa total",
      body: "Setelah edit, total segment dan rollup proyek diperbarui. Simpan proyek jika ada tombol simpan eksplisit di toolbar workspace.",
      deepLink: "/costing",
    },
  ],
  commonMistakes: [
    "Mengisi teks di kolom angka — pesan Validasi \"Angka tidak valid\" muncul di dekat sel.",
  ],
};
