import type { HelpLesson } from "../types";

export const exportQuotation: HelpLesson = {
  track: "quotation",
  slug: "export-quotation",
  title: "Ekspor quotation",
  summary: "Unduh penawaran sebagai Excel atau PDF setelah dokumen siap.",
  durationMin: 4,
  relatedRoutes: ["/documentation"],
  steps: [
    {
      title: "Buka quotation yang siap",
      body: "Pilih quotation dari daftar Documentation. Pastikan item dan total sudah sesuai sebelum mengekspor.",
      deepLink: "/documentation",
      demoId: "export-quotation",
    },
    {
      title: "Pilih format ekspor",
      body: "Gunakan aksi ekspor Excel atau PDF di toolbar quotation. Tombol dinonaktifkan sementara file disiapkan.",
      demoId: "export-quotation",
      uiHint: "Toolbar quotation → Ekspor",
    },
    {
      title: "Simpan file unduhan",
      body: "Browser mengunduh file hasil ekspor. Periksa angka dan header perusahaan di file sebelum dikirim ke pelanggan.",
    },
  ],
  commonMistakes: [
    "Mengekspor sebelum profil perusahaan diisi — header quotation bisa kosong atau memakai placeholder.",
  ],
};
