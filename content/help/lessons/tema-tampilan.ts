import type { HelpLesson } from "../types";

export const temaTampilan: HelpLesson = {
  track: "pengaturan",
  slug: "tema-tampilan",
  title: "Tema dan tampilan",
  summary:
    "Pilih palet Profesional atau Hangat, lalu atur Terang, Gelap, atau Sistem.",
  durationMin: 3,
  relatedRoutes: ["/settings"],
  steps: [
    {
      title: "Buka kartu Tampilan",
      body: "Di Pengaturan, kartu Tampilan berada di dekat bagian atas. Preferensi disimpan di perangkat (localStorage), bukan di server.",
      deepLink: "/settings",
      uiHint: "Pengaturan → Tampilan",
    },
    {
      title: "Pilih palet",
      body: "Profesional memakai aksen hijau; Hangat memakai aksen taupe. Perubahan langsung terlihat di seluruh shell.",
    },
    {
      title: "Pilih appearance",
      body: "Terang dan Gelap memaksa mode. Sistem mengikuti preferensi OS/browser. Muat ulang halaman untuk memastikan preferensi tetap tersimpan.",
    },
  ],
  tips: [
    "Preferensi tema bersifat lokal di browser yang sama; perangkat lain perlu diatur ulang.",
  ],
};
