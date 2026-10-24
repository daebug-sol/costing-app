import type { TourDefinition } from "@/lib/tour/types";

/**
 * Order-to-Cash list tutorials. Below md each list is the mobile explorer
 * (round "+", rows as cards); the same data-tour names sit on both layouts.
 */

export const customersTour: TourDefinition = {
  key: "customers",
  route: "/customers",
  permission: "customers:write",
  invite: {
    title: { id: "Coba tambah pelanggan", en: "Try adding a customer" },
    minutes: 1,
  },
  steps: [
    {
      id: "add",
      kind: "action",
      target: "customers.add",
      advanceOn: "customers.dialog-opened",
      title: { id: "Pelanggan baru", en: "New customer" },
      body: {
        id: "Klik Baru (di ponsel, tombol +) untuk membuka formulir pelanggan.",
        en: "Click Baru (on a phone, the + button) to open the customer form.",
      },
    },
    {
      id: "name",
      kind: "info",
      target: "customers.name",
      title: { id: "Isi nama", en: "Enter a name" },
      body: {
        id: "Ketik nama pelanggan, lalu Lanjut. Hanya nama yang wajib, kolom lain bisa dilengkapi nanti.",
        en: "Type the customer's name, then Next. Only the name is required; the rest can wait.",
      },
    },
    {
      id: "save",
      kind: "action",
      target: "customers.save",
      advanceOn: "customers.created",
      title: { id: "Simpan", en: "Save" },
      body: {
        id: "Tekan Simpan. Pelanggan langsung tersimpan sebagai data asli.",
        en: "Press Simpan. The customer is saved right away as real data.",
      },
    },
    {
      id: "row",
      kind: "info",
      target: "customers.row",
      title: { id: "Pelanggan tersimpan", en: "Customer saved" },
      body: {
        id: "Pelanggan ini bisa dipilih saat membuat penawaran. Kalau hanya untuk latihan, hapus lewat Hapus di barisnya (di ponsel, buka barisnya lalu Hapus).",
        en: "This customer can now be picked when creating a quotation. If it was just practice, remove it with Hapus on its row (on a phone, open the row, then Hapus).",
      },
    },
  ],
};

export const salesOrdersTour: TourDefinition = {
  key: "sales-orders",
  route: "/sales-orders",
  permission: "o2c:order",
  invite: {
    title: { id: "Kenali daftar sales order", en: "Get to know sales orders" },
    minutes: 1,
  },
  steps: [
    {
      id: "row",
      kind: "action",
      target: "sales-orders.row",
      advanceOn: "sales-orders.opened",
      title: { id: "Buka sales order", en: "Open a sales order" },
      body: {
        id: "Sales order muncul di sini setelah penawaran menang dikonversi dari Dokumentasi. Buka satu untuk melihat detailnya.",
        en: "Sales orders appear here once a won quotation is converted from Documentation. Open one to see its details.",
      },
    },
    {
      id: "primary",
      kind: "info",
      target: "sales-orders.primary-action",
      title: { id: "Kirim lalu tagih", en: "Deliver, then bill" },
      body: {
        id: "Isi qty kirim lalu Buat surat jalan. Tagih dengan Invoice DP 50% atau Invoice final. Riwayatnya ada di tab Pengiriman dan Invoice.",
        en: "Enter the quantities to ship, then Buat surat jalan. Bill with Invoice DP 50% or Invoice final. The history lives in the Pengiriman and Invoice tabs.",
      },
    },
  ],
};

export const invoicesTour: TourDefinition = {
  key: "invoices",
  route: "/invoices",
  permission: "o2c:invoice",
  invite: {
    title: { id: "Kenali daftar invoice", en: "Get to know invoices" },
    minutes: 1,
  },
  steps: [
    {
      id: "row",
      kind: "action",
      target: "invoices.row",
      advanceOn: "invoices.opened",
      title: { id: "Buka invoice", en: "Open an invoice" },
      body: {
        id: "Invoice dibuat dari detail sales order. Yang lewat jatuh tempo ditandai Overdue. Buka satu untuk melihat detailnya.",
        en: "Invoices are created from a sales order's details. Past-due ones are marked Overdue. Open one to see its details.",
      },
    },
    {
      id: "primary",
      kind: "info",
      target: "invoices.primary-action",
      title: { id: "Terbitkan dan kirim", en: "Issue and send" },
      body: {
        id: "Invoice draft: isi jatuh tempo, lalu Kirim untuk menerbitkan nomor. PDF untuk dikirim ke pelanggan. Void membatalkan invoice yang belum dibayar.",
        en: "Draft invoice: set the due date, then Kirim to issue its number. PDF is the file for the customer. Void cancels an unpaid invoice.",
      },
    },
  ],
};

export const paymentsTour: TourDefinition = {
  key: "payments",
  route: "/payments",
  permission: "o2c:payment",
  invite: {
    title: { id: "Kenali daftar pembayaran", en: "Get to know payments" },
    minutes: 1,
  },
  steps: [
    {
      id: "row",
      kind: "info",
      target: "payments.row",
      title: { id: "Riwayat pembayaran", en: "Payment history" },
      body: {
        id: "Setiap uang masuk dari pelanggan tercatat di sini. Void membatalkan penerimaan yang salah catat.",
        en: "Every payment received from a customer is listed here. Void cancels one that was recorded by mistake.",
      },
    },
    {
      id: "primary",
      kind: "info",
      target: "payments.primary-action",
      title: { id: "Catat penerimaan", en: "Record a payment" },
      body: {
        id: "Catat uang masuk di Penerimaan baru (di ponsel, tombol +): pilih pelanggan dan isi jumlah. Simpan (FIFO) melunasi invoice terlama lebih dulu.",
        en: "Record money received under Penerimaan baru (on a phone, the + button): pick the customer and enter the amount. Simpan (FIFO) pays the oldest invoices first.",
      },
    },
  ],
};
