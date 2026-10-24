import type { TourDefinition } from "@/lib/tour/types";

/** First-run tour: where everything lives. Main menus switch to the bottom bar below lg. */
export const welcomeTour: TourDefinition = {
  key: "welcome",
  steps: [
    {
      id: "hello",
      kind: "info",
      title: { id: "Selamat datang, {name}", en: "Welcome, {name}" },
      body: {
        id: "Kenalan dulu dengan aplikasinya, cuma 1 menit.",
        en: "Let's get you familiar with the app. It takes about a minute.",
      },
    },
    {
      id: "dashboard",
      kind: "info",
      target: "nav.dashboard",
      targetMobile: "nav-mobile.dashboard",
      title: { id: "Dashboard", en: "Dashboard" },
      body: {
        id: "Ringkasan penjualan pribadi Anda: target bulanan, grafik, dan follow-up yang perlu dikerjakan.",
        en: "Your personal sales overview: monthly target, charts, and follow-ups to do.",
      },
    },
    {
      id: "database",
      kind: "info",
      target: "nav.database",
      targetMobile: "nav-mobile.database",
      title: { id: "Database", en: "Database" },
      body: {
        id: "Harga material, profil, dan komponen. Semua harga di costing diambil dari sini.",
        en: "Material prices, profiles, and components. Every price in costing comes from here.",
      },
    },
    {
      id: "costing",
      kind: "info",
      target: "nav.costing",
      targetMobile: "nav-mobile.costing",
      title: { id: "Costing", en: "Costing" },
      body: {
        id: "Buat proyek, tambah item, lihat harga jual, lalu buat penawaran.",
        en: "Create a project, add items, see the selling price, then create a quotation.",
      },
    },
    {
      id: "documentation",
      kind: "info",
      target: "nav.documentation",
      targetMobile: "nav-mobile.documentation",
      title: { id: "Dokumentasi", en: "Documentation" },
      body: {
        id: "Semua penawaran Anda, lalu lanjut ke sales order, invoice, dan pembayaran.",
        en: "All your quotations, then on to sales orders, invoices, and payments.",
      },
    },
    {
      id: "account",
      kind: "info",
      target: "account.menu",
      title: { id: "Menu akun", en: "Account menu" },
      body: {
        id: "Help, Pengaturan, dan Ulangi tur ada di sini. Tiap modul juga punya tutorial singkat saat pertama dibuka.",
        en: "Help, Settings, and Replay tour live here. Each module also has a short tutorial the first time you open it.",
      },
    },
  ],
};
