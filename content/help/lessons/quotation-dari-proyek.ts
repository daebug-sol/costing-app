import type { HelpLesson } from "../types";

export const quotationDariProyek: HelpLesson = {
  track: "quotation",
  slug: "quotation-dari-proyek",
  title: "Quotation dari proyek",
  summary:
    "Buat dokumen penawaran di Documentation berdasarkan proyek costing yang sudah dihitung.",
  durationMin: 6,
  relatedRoutes: ["/documentation"],
  steps: [
    {
      title: "Pastikan proyek sudah dihitung",
      body: "Quotation menarik angka dari proyek Costing. Pastikan segment utama sudah terisi sebelum menyusun penawaran.",
      deepLink: "/costing",
    },
    {
      title: "Buka Documentation",
      body: "Modul Documentation menampilkan daftar quotation. Buat quotation baru dan tautkan ke proyek yang relevan.",
      deepLink: "/documentation",
      uiHint: "Navbar → Documentation",
    },
    {
      title: "Lengkapi item penawaran",
      body: "Periksa item, syarat pembayaran, dan masa berlaku. Sesuaikan teks cover bila perlu sebelum mengekspor.",
      deepLink: "/documentation",
    },
  ],
  tips: [
    "Syarat default (pembayaran, delivery, garansi) bisa diisi di Pengaturan agar quotation baru lebih cepat.",
  ],
};
