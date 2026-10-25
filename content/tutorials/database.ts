import type { TourContext, TourDefinition } from "@/lib/tour/types";

const ahu = (ctx: TourContext) => ctx.modules.ahu;
const noAhu = (ctx: TourContext) => !ctx.modules.ahu;

/**
 * "Coba sendiri" for Database. With the AHU module the user walks to the
 * material price list, searches it and opens the price editor without saving.
 * Without it, the user opens their own folder and a file (their price lists).
 */
export const databaseTour: TourDefinition = {
  key: "database",
  route: "/database",
  permission: "db:read",
  invite: {
    title: {
      id: "Coba cari dan edit harga",
      en: "Try finding and editing a price",
    },
    minutes: 2,
  },
  steps: [
    {
      id: "ahu",
      kind: "action",
      target: "database.folder.ahu",
      when: ahu,
      title: { id: "Buka AHU Database", en: "Open AHU Database" },
      body: {
        id: "Harga material, data profil, dan katalog komponen AHU tersimpan di sini.",
        en: "AHU material prices, profile data, and the component catalog live here.",
      },
      advanceOn: "database.ahu-opened",
    },
    {
      id: "folder",
      kind: "action",
      target: "database.folder.material",
      when: ahu,
      title: { id: "Buka Harga material", en: "Open Material prices" },
      body: {
        id: "Harga per kg di sini dipakai untuk menghitung material di costing AHU.",
        en: "The per-kg prices here are used to cost materials in AHU costing.",
      },
      advanceOn: "database.folder-opened",
    },
    {
      id: "my-folder",
      kind: "action",
      target: "database.folder.mine",
      when: noAhu,
      title: { id: "Buka folder", en: "Open a folder" },
      body: {
        id: "Daftar harga dikelompokkan dalam folder. Buka folder ini.",
        en: "Price lists are grouped in folders. Open this one.",
      },
      advanceOn: "database.folder-opened",
    },
    {
      id: "new-file",
      kind: "info",
      target: "database.new-file",
      when: noAhu,
      title: { id: "Buat daftar harga", en: "Create a price list" },
      body: {
        id: "File baru sudah berisi kolom Code, Name, UOM, dan Price. Bisa juga impor dari Excel.",
        en: "A new file comes with Code, Name, UOM, and Price columns. You can also import from Excel.",
      },
    },
    {
      id: "file",
      kind: "action",
      target: "database.file",
      title: { id: "Buka file harga", en: "Open a price file" },
      body: {
        id: "Satu folder bisa berisi beberapa file. Buka file ini untuk melihat isinya.",
        en: "A folder can hold several files. Open this one to see what's inside.",
      },
      advanceOn: "database.file-opened",
    },
    {
      id: "search",
      kind: "action",
      target: "database.search",
      when: ahu,
      title: { id: "Cari material", en: "Find a material" },
      body: {
        id: "Ketik kode, nama, atau kategori, misalnya SGCC.",
        en: "Type a code, name, or category, for example SGCC.",
      },
      advanceOn: "database.searched",
    },
    {
      id: "edit",
      kind: "action",
      target: "database.price-edit",
      when: ahu,
      title: { id: "Buka editor harga", en: "Open the price editor" },
      body: {
        id: "Klik ikon pensil di baris hasil pencarian.",
        en: "Click the pencil icon on the search result.",
      },
      advanceOn: "database.cell-editor-opened",
    },
    {
      id: "cancel",
      kind: "action",
      target: "database.price-editor-actions",
      when: ahu,
      title: { id: "Batal tanpa menyimpan", en: "Cancel without saving" },
      body: {
        id: "Harga diubah di form ini lalu Simpan. Untuk latihan, tekan Batal atau Esc: harga tidak berubah.",
        en: "Prices are changed in this form, then Save. For practice, press Cancel or Esc: the price stays the same.",
      },
      advanceOn: "database.cell-editor-closed",
    },
    {
      id: "price",
      kind: "info",
      target: "database.price-cell",
      when: ahu,
      title: { id: "Harga untuk costing", en: "Prices for costing" },
      body: {
        id: "Costing memakai harga ini saat menghitung. Untuk mengubahnya, klik ikon pensil lalu Simpan.",
        en: "Costing uses this price when it calculates. To change it, click the pencil icon, then Save.",
      },
    },
    {
      id: "grid",
      kind: "info",
      target: "database.grid",
      when: noAhu,
      title: { id: "Ubah langsung di tabel", en: "Edit right in the table" },
      body: {
        id: "Klik dua kali sel untuk mengubah, Enter untuk simpan, Esc untuk batal. Perubahan tersimpan otomatis.",
        en: "Double-click a cell to edit, Enter to save, Esc to cancel. Changes save automatically.",
      },
    },
  ],
};
