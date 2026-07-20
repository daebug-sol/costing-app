import type { HelpLesson } from "../types";

export const setupOrganisasi: HelpLesson = {
  track: "mulai-cepat",
  slug: "setup-organisasi",
  title: "Setup organisasi",
  summary:
    "Lengkapi profil perusahaan dan kurs forex agar quotation serta database harga siap dipakai.",
  durationMin: 5,
  relatedRoutes: ["/settings"],
  steps: [
    {
      title: "Buka Pengaturan",
      body: "Kartu selamat datang muncul jika setup belum ditandai selesai. Isi nama perusahaan, alamat, dan kontak terlebih dahulu.",
      deepLink: "/settings",
      uiHint: "Pengaturan → Profil perusahaan",
    },
    {
      title: "Set kurs forex default",
      body: "Isi kurs USD, EUR, RM, dan SGD yang dipakai organisasi. Nilai ini menjadi acuan konversi di database harga dan costing.",
      uiHint: "Kartu Forex",
    },
    {
      title: "Periksa default costing",
      body: "Overhead, contingency, margin, dan PPN default diterapkan ke proyek baru. Sesuaikan sebelum tim mulai menghitung.",
      uiHint: "Kartu Default costing",
    },
    {
      title: "Tandai setup selesai",
      body: "Setelah data inti terisi, tekan Tandai setup selesai pada kartu selamat datang agar banner onboarding tidak muncul lagi.",
    },
  ],
  commonMistakes: [
    "Melewati kurs forex — quotation bisa menampilkan konversi yang tidak sesuai praktik organisasi.",
  ],
};
