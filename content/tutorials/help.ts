import type { Localized, TourDefinition } from "@/lib/tour/types";

/** Targets stay small (heading, one button) so the card never covers them, even with every tutorial listed. */
export const helpTour: TourDefinition = {
  key: "help",
  route: "/help",
  permission: "dashboard:read",
  invite: {
    title: {
      id: "Lihat cara mengulang tutorial",
      en: "See how to replay tutorials",
    },
    minutes: 1,
  },
  steps: [
    {
      id: "list",
      kind: "info",
      target: "help.tutorials",
      title: { id: "Tutorial interaktif", en: "Interactive tutorials" },
      body: {
        id: "Semua tutorial ada di bagian ini. Tiap baris menunjukkan statusnya: Belum, Selesai, atau Dilewati.",
        en: "Every tutorial is listed here. Each row shows its status: Not started, Done, or Skipped.",
      },
    },
    {
      id: "replay",
      kind: "info",
      target: "help.tutorials.replay",
      title: { id: "Ulangi kapan saja", en: "Replay any time" },
      body: {
        id: "Tekan Mulai atau Ulangi untuk menjalankan tutorial itu di halamannya. Tur selamat datang juga ada di menu akun.",
        en: "Press Start or Replay to run that tutorial on its page. The welcome tour is also in the account menu.",
      },
    },
  ],
};

/** Copy for the "Tutorial interaktif" section of the Help hub. */
export const helpTutorialsCopy: {
  heading: Localized;
  description: Localized;
  welcomeTitle: Localized;
  minutes: Localized;
  status: { none: Localized; done: Localized; skipped: Localized };
  start: Localized;
  replay: Localized;
  /** `{title}` is the tutorial's name; read by screen readers on each row button. */
  startLabel: Localized;
  replayLabel: Localized;
} = {
  heading: { id: "Tutorial interaktif", en: "Interactive tutorials" },
  description: {
    id: "Coba tiap modul langsung di layar aslinya.",
    en: "Try each module right on its real screen.",
  },
  welcomeTitle: { id: "Tur selamat datang", en: "Welcome tour" },
  minutes: { id: "{minutes} menit", en: "{minutes} min" },
  status: {
    none: { id: "Belum", en: "Not started" },
    done: { id: "Selesai", en: "Done" },
    skipped: { id: "Dilewati", en: "Skipped" },
  },
  start: { id: "Mulai", en: "Start" },
  replay: { id: "Ulangi", en: "Replay" },
  startLabel: { id: "Mulai tutorial {title}", en: "Start the {title} tutorial" },
  replayLabel: { id: "Ulangi tutorial {title}", en: "Replay the {title} tutorial" },
};
