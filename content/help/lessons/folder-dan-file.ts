import type { HelpLesson } from "../types";

export const folderDanFile: HelpLesson = {
  track: "database",
  slug: "folder-dan-file",
  title: "Folder dan file database",
  summary:
    "Buat folder, tambah file harga, lalu isi baris referensi untuk dipakai di costing.",
  durationMin: 6,
  relatedRoutes: ["/database"],
  steps: [
    {
      title: "Buka Database",
      body: "Modul Database punya panel folder di kiri dan daftar file di kanan. Pilih mode AHU atau custom sesuai jenis data.",
      deepLink: "/database",
      demoId: "folder-file",
      uiHint: "Navbar → Database",
    },
    {
      title: "Buat atau pilih folder",
      body: "Folder mengelompokkan file harga. Pilih folder aktif sebelum membuat file baru agar file tersimpan di lokasi yang benar.",
      demoId: "folder-file",
      uiHint: "Panel kiri → Folder baru",
    },
    {
      title: "Tambah file",
      body: "Di panel file, tekan File baru. Beri nama yang jelas (misalnya kategori material atau vendor) agar mudah dicari saat costing.",
      demoId: "folder-file",
      uiHint: "Panel kanan → File baru",
    },
    {
      title: "Isi baris data",
      body: "Buka file lalu tambah baris harga. Data ini menjadi sumber lookup di workspace Costing.",
      deepLink: "/database",
    },
  ],
  tips: [
    "Pakai pencarian di Database untuk menemukan file lama tanpa membuka setiap folder.",
  ],
  commonMistakes: [
    "Membuat file tanpa memilih folder aktif — tombol File baru tetap nonaktif sampai folder dipilih.",
  ],
};
