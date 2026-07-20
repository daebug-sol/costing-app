import type { HelpTrack } from "./types";

export const HELP_TRACKS: HelpTrack[] = [
  {
    id: "mulai-cepat",
    title: "Mulai cepat",
    summary: "Orientasi aplikasi dan setup organisasi pertama.",
    order: 1,
  },
  {
    id: "database",
    title: "Database",
    summary: "Folder, file harga, dan pencarian data referensi.",
    order: 2,
  },
  {
    id: "costing",
    title: "Costing",
    summary: "Proyek, segment AHU, dan edit sel perhitungan.",
    order: 3,
  },
  {
    id: "quotation",
    title: "Quotation",
    summary: "Buat penawaran dari proyek dan ekspor dokumen.",
    order: 4,
  },
  {
    id: "dashboard",
    title: "Dashboard",
    summary: "Ringkasan finansial dan drill ke proyek.",
    order: 5,
  },
  {
    id: "pengaturan",
    title: "Pengaturan",
    summary: "Profil organisasi, default costing, dan tampilan.",
    order: 6,
  },
];
