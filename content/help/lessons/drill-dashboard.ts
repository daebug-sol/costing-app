import type { HelpLesson } from "../types";

export const drillDashboard: HelpLesson = {
  track: "dashboard",
  slug: "drill-dashboard",
  title: "Drill dari Dashboard",
  summary:
    "Baca KPI ringkas, lalu buka proyek terkait dari Dashboard untuk detail costing.",
  durationMin: 4,
  relatedRoutes: ["/"],
  steps: [
    {
      title: "Baca ringkasan KPI",
      body: "Hero KPI menampilkan metrik utama. Filter rentang waktu (bulan ini, tahun berjalan, 12 bulan, semua) mengubah angka yang ditampilkan.",
      deepLink: "/",
      uiHint: "Toolbar Dashboard → rentang waktu",
    },
    {
      title: "Buka insight",
      body: "Tab Finansial, Penjualan, dan Costing memecah ringkasan. Gunakan Lihat detail bila butuh tabel lengkap di Sheet.",
      uiHint: "Insight utama → tab",
    },
    {
      title: "Drill ke proyek",
      body: "Dari daftar atau filter proyek, buka proyek di Costing untuk memperbaiki angka yang mempengaruhi Dashboard.",
      deepLink: "/costing",
    },
  ],
};
