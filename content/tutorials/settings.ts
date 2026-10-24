import type { Localized, TourDefinition } from "@/lib/tour/types";

/**
 * Typing happens on an info step (the shade blocks clicks outside the hole,
 * and the field and its Simpan button sit far apart), then the save is the
 * action step.
 */
export const settingsTour: TourDefinition = {
  key: "settings",
  route: "/settings",
  permission: "settings:write",
  invite: {
    title: {
      id: "Lengkapi data perusahaan",
      en: "Complete your company details",
    },
    minutes: 2,
  },
  steps: [
    {
      id: "company",
      kind: "info",
      target: "settings.company-name",
      title: { id: "Nama perusahaan", en: "Company name" },
      body: {
        id: "Ketik nama perusahaan Anda. Nama ini tampil di penawaran, invoice, dan surat jalan.",
        en: "Type your company name. It appears on quotations, invoices, and delivery orders.",
      },
    },
    {
      id: "company-save",
      kind: "action",
      target: "settings.company-save",
      title: { id: "Simpan profil perusahaan", en: "Save the company profile" },
      body: {
        id: "Tekan Simpan. Perubahan langsung dipakai di dokumen berikutnya.",
        en: "Press Save. The change applies to the next documents you create.",
      },
      advanceOn: "settings.company-saved",
    },
    {
      id: "forex",
      kind: "info",
      target: "settings.forex-usd",
      title: { id: "Kurs USD", en: "USD rate" },
      body: {
        id: "Isi kurs USD ke Rupiah. Harga dalam USD di Database diubah ke Rupiah dengan kurs ini.",
        en: "Enter the USD to Rupiah rate. USD prices in the Database are converted to Rupiah with it.",
      },
    },
    {
      id: "forex-save",
      kind: "action",
      target: "settings.forex-save",
      title: { id: "Simpan kurs", en: "Save the rates" },
      body: {
        id: "Tekan Simpan. Kurs baru dipakai saat harga USD diisi atau diimpor di Database.",
        en: "Press Save. The new rate is used when USD prices are entered or imported in the Database.",
      },
      advanceOn: "settings.forex-saved",
    },
    {
      id: "appearance",
      kind: "info",
      target: "settings.appearance",
      title: { id: "Tampilan dan bahasa", en: "Appearance and language" },
      body: {
        id: "Pilih palet, mode terang atau gelap, dan bahasa aplikasi. Pilihan ini tersimpan di perangkat ini.",
        en: "Pick the palette, light or dark mode, and the app language. These choices are saved on this device.",
      },
    },
  ],
};

/** Button on the Pengaturan onboarding card that starts this tutorial. */
export const settingsOnboardingCopy: { start: Localized } = {
  start: { id: "Mulai tutorial", en: "Start tutorial" },
};
