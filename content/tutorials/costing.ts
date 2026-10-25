import type { TourDefinition } from "@/lib/tour/types";

/**
 * "Coba sendiri" for Costing: the user builds a real practice project, from the
 * project list to a quotation draft. Action steps advance on tourEvent names
 * emitted by components/costing/*; the last one advances when Documentation opens.
 */
export const costingTour: TourDefinition = {
  key: "costing",
  route: "/costing",
  permission: "costing:write",
  invite: {
    title: {
      id: "Coba buat costing pertama",
      en: "Try your first costing",
    },
    minutes: 3,
  },
  steps: [
    {
      id: "new-project",
      kind: "action",
      target: "costing.new-project",
      advanceOn: "costing.new-project-dialog-opened",
      title: { id: "Buat proyek baru", en: "Create a new project" },
      body: {
        id: "Satu proyek berisi semua item yang akan ditawarkan ke satu pelanggan. Klik Proyek baru.",
        en: "A project holds every item you will quote to one customer. Click New project.",
      },
    },
    {
      id: "name",
      kind: "action",
      target: "costing.new-project-dialog",
      advanceOn: "costing.project-created",
      title: { id: "Beri nama proyek", en: "Name the project" },
      body: {
        id: "Isi nama, misalnya \"Latihan costing\", lalu klik Buat. Proyek langsung terbuka.",
        en: "Type a name such as \"Practice costing\" and create it. The project opens right away.",
      },
    },
    {
      id: "add-item",
      kind: "action",
      target: "costing.add-item",
      targetMobile: "costing.add-item.single",
      advanceOn: "costing.item-added",
      when: (ctx) => !ctx.modules.ahu,
      title: { id: "Tambah item", en: "Add an item" },
      body: {
        id: "Pilih Single Item untuk barang dengan satu daftar material. Group Item untuk barang yang dibagi per bagian.",
        en: "Pick Single Item for a product with one material list. Group Item splits a product into parts.",
      },
    },
    {
      id: "add-item-ahu",
      kind: "action",
      target: "costing.add-item",
      targetMobile: "costing.add-item.single",
      advanceOn: "costing.item-added",
      when: (ctx) => ctx.modules.ahu,
      title: { id: "Tambah item", en: "Add an item" },
      body: {
        id: "Pilih Single Item untuk latihan ini. Auto-AHU menghitung unit AHU dari kapasitas udara, bisa dicoba nanti.",
        en: "Pick Single Item for this practice. Auto-AHU sizes an AHU unit from its airflow; try it later.",
      },
    },
    {
      id: "add-material",
      kind: "action",
      target: "costing.add-material",
      advanceOn: "costing.material-picker-opened",
      title: { id: "Tambah material", en: "Add materials" },
      body: {
        id: "Isi item dengan material dari Database. Klik Tambah material.",
        en: "Fill the item with materials from the Database. Click Add material.",
      },
    },
    {
      id: "pick-material",
      kind: "action",
      target: "costing.material-picker.list",
      targetMobile: "costing.material-picker.row",
      advanceOn: "costing.material-picked",
      title: { id: "Pilih material", en: "Pick a material" },
      body: {
        id: "Centang satu material. Harganya diambil dari Database.",
        en: "Tick a material. Its price comes from the Database.",
      },
    },
    {
      id: "confirm-material",
      kind: "action",
      target: "costing.material-picker.confirm",
      advanceOn: "costing.material-added",
      title: { id: "Masukkan ke item", en: "Add it to the item" },
      body: {
        id: "Qty bisa diubah di daftar Item terpilih. Lalu klik Tambahkan ke item.",
        en: "Adjust the qty in the selected list if needed, then click the highlighted button.",
      },
    },
    {
      id: "price",
      kind: "info",
      target: "costing.price-bar",
      title: { id: "Harga jual langsung terhitung", en: "Selling price, computed live" },
      body: {
        id: "Total biaya dan harga jual diperbarui setiap kali item atau qty berubah.",
        en: "Total cost and selling price update whenever an item or the qty changes.",
      },
    },
    {
      id: "margins",
      kind: "info",
      target: "costing.margins",
      targetMobile: "costing.margins.margin",
      title: { id: "Atur margin", en: "Set the margin" },
      body: {
        id: "Ubah persen margin di sini. Overhead dan biaya tambahan lain ada di kartu yang sama, dan harga jual ikut menyesuaikan.",
        en: "Change the margin percentage here. Overhead and other extra costs sit in the same card, and the selling price follows.",
      },
    },
    {
      id: "cleanup",
      kind: "info",
      target: "costing.project-menu",
      title: { id: "Proyek latihan bisa dihapus", en: "Practice projects can be deleted" },
      body: {
        id: "Proyek ini data asli. Bila hanya latihan, hapus lewat menu ini dengan Hapus proyek. Proyek yang sudah punya penawaran baru bisa dihapus setelah penawarannya dihapus.",
        en: "This project is real data. If it was only practice, use Delete project in this menu. A project with a quotation can be deleted once its quotation is deleted.",
      },
    },
    {
      id: "quote",
      kind: "action",
      target: "costing.create-quote",
      advanceOnRoute: "/documentation",
      title: { id: "Buat penawaran", en: "Create a quotation" },
      body: {
        id: "Terakhir, klik Buat penawaran. Draft penawaran dari proyek ini dibuat di Dokumentasi. Penawaran latihan bisa dihapus di sana.",
        en: "Last, click Create quotation. A draft quotation for this project is created in Documentation. A practice quotation can be deleted there.",
      },
    },
  ],
};
