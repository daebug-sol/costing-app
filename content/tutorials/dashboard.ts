import type { TourDefinition } from "@/lib/tour/types";

/**
 * Dashboard "Coba sendiri": read the overview, set a real monthly target, open
 * one follow-up. The target and follow-up blocks only exist on the member's own
 * view with data; missing targets are skipped by the engine.
 */
export const dashboardTour: TourDefinition = {
  key: "dashboard",
  route: "/",
  permission: "dashboard:read",
  invite: {
    title: {
      id: "Kenali dashboard Anda",
      en: "Get to know your dashboard",
    },
    minutes: 2,
  },
  steps: [
    {
      id: "greeting",
      kind: "info",
      target: "dashboard.greeting",
      title: { id: "Sapaan harian", en: "Daily greeting" },
      body: {
        id: "Tiap hari dimulai di sini: berapa follow-up yang menunggu, sisa target bulan ini, dan order baru kemarin.",
        en: "Every day starts here: follow-ups waiting, what is left of this month's target, and yesterday's new orders.",
      },
    },
    {
      id: "kpi",
      kind: "info",
      target: "dashboard.kpi",
      title: { id: "Angka utama", en: "Key figures" },
      body: {
        id: "Penjualan bulan ini, win rate, margin, dan nilai pipeline. Semua hanya milik Anda, dibandingkan dengan bulan lalu.",
        en: "Sales this month, win rate, margin, and pipeline value. All yours only, compared with last month.",
      },
    },
    {
      id: "target",
      kind: "action",
      target: "dashboard.target",
      title: { id: "Atur target bulanan", en: "Set your monthly target" },
      body: {
        id: "Klik Atur target (atau Ubah target) untuk mengisi target penjualan Anda bulan ini.",
        en: "Click Set target (or Edit target) to enter your sales target for this month.",
      },
      advanceOn: "dashboard.target-dialog-opened",
    },
    {
      id: "target-save",
      kind: "action",
      target: "dashboard.target-dialog",
      title: { id: "Isi lalu simpan", en: "Fill in and save" },
      body: {
        id: "Ketik target dalam rupiah, lalu Simpan. Bisa diubah atau dihapus kapan saja lewat Ubah target.",
        en: "Type the target in rupiah, then Save. You can change or clear it anytime with Edit target.",
      },
      advanceOn: "dashboard.target-saved",
    },
    {
      id: "follow-up",
      kind: "action",
      target: "dashboard.follow-up",
      title: { id: "Buka satu follow-up", en: "Open a follow-up" },
      body: {
        id: "Penawaran yang hampir habis, invoice telat, dan order yang menunggu. Klik salah satu untuk langsung membukanya.",
        en: "Quotations about to expire, overdue invoices, and waiting orders. Click one to open it right away.",
      },
      advanceOn: "dashboard.follow-up-opened",
    },
  ],
};
