import type { TourDefinition } from "@/lib/tour/types";

/**
 * Quotations list to PDF. Only opens and exports: nothing is created or
 * changed, so there is no practice data to clean up afterwards.
 */
export const documentationTour: TourDefinition = {
  key: "documentation",
  route: "/documentation",
  permission: "o2c:quote",
  invite: {
    title: {
      id: "Coba buka penawaran dan unduh PDF",
      en: "Try opening a quotation and downloading the PDF",
    },
    minutes: 2,
  },
  steps: [
    {
      id: "folder",
      kind: "action",
      target: "documentation.folder.all",
      advanceOn: "documentation.folder-opened",
      title: { id: "Folder per pelanggan", en: "A folder per customer" },
      body: {
        id: "Penawaran dikelompokkan per pelanggan. Klik Semua penawaran untuk melihat seluruhnya.",
        en: "Quotations are grouped by customer. Click All quotations to see every one.",
      },
    },
    {
      id: "row",
      kind: "action",
      target: "documentation.quote-row",
      advanceOn: "documentation.quote-expanded",
      title: { id: "Pilih satu penawaran", en: "Pick a quotation" },
      body: {
        id: "Klik penawaran ini untuk melihat sudah sampai tahap mana.",
        en: "Click this quotation to see how far it has gone.",
      },
    },
    {
      id: "o2c",
      kind: "info",
      target: "documentation.o2c-progress",
      title: { id: "Progres order-to-cash", en: "Order-to-cash progress" },
      body: {
        id: "Penawaran, Sales Order, Surat Jalan, Invoice, lalu Pembayaran. Tahap yang sudah ada bisa diklik untuk membuka dokumennya.",
        en: "Quotation, Sales Order, Delivery Note, Invoice, then Payment. Click any stage that exists to open its document.",
      },
    },
    {
      id: "open",
      kind: "action",
      target: "documentation.open-quote",
      advanceOn: "documentation.quote-opened",
      title: { id: "Buka penawarannya", en: "Open the quotation" },
      body: {
        id: "Klik Penawaran untuk membuka dokumennya.",
        en: "Click Quotation to open the document.",
      },
    },
    {
      id: "preview",
      kind: "info",
      target: "documentation.preview",
      targetMobile: "documentation.preview-toggle",
      title: { id: "Pratinjau", en: "Preview" },
      body: {
        id: "Beginilah dokumen yang diterima pelanggan. Tombol mata menampilkan atau menyembunyikan pratinjau.",
        en: "This is the document your customer receives. The eye button shows or hides the preview.",
      },
    },
    {
      id: "export",
      kind: "action",
      target: "documentation.export",
      advanceOn: "documentation.export-menu-opened",
      title: { id: "Export", en: "Export" },
      body: {
        id: "Klik Export. Isinya mengikuti jenis dokumen yang dipilih: Quotation, Detailed costing, atau Internal costing.",
        en: "Click Export. It follows the selected document type: Quotation, Detailed costing, or Internal costing.",
      },
    },
    {
      id: "export-pdf",
      kind: "action",
      target: "documentation.export-pdf",
      advanceOn: "documentation.pdf-exported",
      title: { id: "Unduh PDF", en: "Download the PDF" },
      body: {
        id: "Pilih PDF. File langsung terunduh dan penawarannya tidak berubah.",
        en: "Choose PDF. The file downloads right away and the quotation stays unchanged.",
      },
    },
    {
      id: "sales-order",
      kind: "info",
      target: "documentation.to-sales-order",
      title: { id: "Lanjut ke Sales Order", en: "On to the Sales Order" },
      body: {
        id: "Setelah status penawaran Menang, tombol ini membuat Sales Order-nya. Panah kiri kembali ke daftar penawaran.",
        en: "Once the quotation is Won, this button creates its Sales Order. The left arrow goes back to the quotation list.",
      },
    },
  ],
};
