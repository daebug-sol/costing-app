import type { HelpLesson } from "../types";

export const orientasiAplikasi: HelpLesson = {
  track: "mulai-cepat",
  slug: "orientasi-aplikasi",
  title: "Orientasi aplikasi",
  summary:
    "Kenali navigasi utama: Dashboard, Database, Costing, Documentation, Help, dan Pengaturan.",
  durationMin: 3,
  relatedRoutes: ["/"],
  steps: [
    {
      title: "Buka Dashboard",
      body: "Setelah masuk, Dashboard menampilkan ringkasan finansial proyek dan quotation. Ini titik awal untuk melihat status estimasi dan penjualan.",
      deepLink: "/",
      uiHint: "Navbar → Dashboard",
    },
    {
      title: "Jelajahi modul utama",
      body: "Database menyimpan harga referensi. Costing menghitung proyek AHU. Documentation menyusun quotation. Help (halaman ini) menjelaskan alur kerja langkah demi langkah.",
      uiHint: "Navbar: Database, Costing, Documentation, Help",
    },
    {
      title: "Buka Pengaturan bila perlu",
      body: "Profil perusahaan, kurs forex, dan default margin ada di Pengaturan. Setup awal organisasi biasanya dimulai di sana.",
      deepLink: "/settings",
      uiHint: "Tombol Pengaturan di kanan Navbar",
    },
  ],
  tips: [
    "Label navigasi tetap dalam bahasa Inggris agar konsisten dengan modul; isi Help memakai Bahasa Indonesia.",
  ],
};
