import type { TourDefinition } from "@/lib/tour/types";

export const customersTour: TourDefinition = {
  key: "customers",
  route: "/customers",
  permission: "customers:write",
  invite: {
    title: { id: "Coba tambah pelanggan", en: "Try adding a customer" },
    minutes: 1,
  },
  steps: [],
};

export const salesOrdersTour: TourDefinition = {
  key: "sales-orders",
  route: "/sales-orders",
  permission: "o2c:order",
  invite: {
    title: { id: "Kenali daftar sales order", en: "Get to know sales orders" },
    minutes: 1,
  },
  steps: [],
};

export const invoicesTour: TourDefinition = {
  key: "invoices",
  route: "/invoices",
  permission: "o2c:invoice",
  invite: {
    title: { id: "Kenali daftar invoice", en: "Get to know invoices" },
    minutes: 1,
  },
  steps: [],
};

export const paymentsTour: TourDefinition = {
  key: "payments",
  route: "/payments",
  permission: "o2c:payment",
  invite: {
    title: { id: "Kenali daftar pembayaran", en: "Get to know payments" },
    minutes: 1,
  },
  steps: [],
};
