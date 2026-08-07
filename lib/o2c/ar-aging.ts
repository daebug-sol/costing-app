import { finite } from "@/lib/calculations";

export type ArInvoiceInput = {
  id: string;
  invNumber: string | null;
  customerId: string;
  customerName: string;
  dueDate: Date | string | null;
  grandTotal: number;
  paidTotal: number;
  status: string;
};

export type ArAgingBucket = "current" | "d1_30" | "d31_60" | "d61_90" | "d90_plus";

export type ArAgingRow = {
  invoiceId: string;
  invNumber: string;
  customerId: string;
  customerName: string;
  dueDate: string | null;
  openAmount: number;
  daysPastDue: number;
  bucket: ArAgingBucket;
};

export type ArAgingSummary = {
  rows: ArAgingRow[];
  totals: Record<ArAgingBucket, number>;
  byCustomer: Array<{
    customerId: string;
    customerName: string;
    openAmount: number;
  }>;
};

function bucketFor(daysPastDue: number): ArAgingBucket {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "d1_30";
  if (daysPastDue <= 60) return "d31_60";
  if (daysPastDue <= 90) return "d61_90";
  return "d90_plus";
}

export function buildArAging(
  invoices: ArInvoiceInput[],
  asOf: Date = new Date()
): ArAgingSummary {
  const asOfMs = asOf.getTime();
  const rows: ArAgingRow[] = [];

  for (const inv of invoices) {
    const status = (inv.status ?? "").toLowerCase();
    if (status === "void" || status === "draft" || status === "paid") continue;
    const open = Math.max(0, finite(inv.grandTotal, 0) - finite(inv.paidTotal, 0));
    if (open <= 0.01) continue;

    const due = inv.dueDate ? new Date(inv.dueDate) : null;
    const daysPastDue = due
      ? Math.floor((asOfMs - due.getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    const bucket = bucketFor(daysPastDue);

    rows.push({
      invoiceId: inv.id,
      invNumber: inv.invNumber ?? "—",
      customerId: inv.customerId,
      customerName: inv.customerName,
      dueDate: due ? due.toISOString() : null,
      openAmount: Math.round(open * 100) / 100,
      daysPastDue,
      bucket,
    });
  }

  const totals: Record<ArAgingBucket, number> = {
    current: 0,
    d1_30: 0,
    d31_60: 0,
    d61_90: 0,
    d90_plus: 0,
  };
  const custMap = new Map<string, { customerId: string; customerName: string; openAmount: number }>();

  for (const r of rows) {
    totals[r.bucket] += r.openAmount;
    const prev = custMap.get(r.customerId);
    if (prev) prev.openAmount += r.openAmount;
    else {
      custMap.set(r.customerId, {
        customerId: r.customerId,
        customerName: r.customerName,
        openAmount: r.openAmount,
      });
    }
  }

  for (const k of Object.keys(totals) as ArAgingBucket[]) {
    totals[k] = Math.round(totals[k] * 100) / 100;
  }

  const byCustomer = [...custMap.values()]
    .map((c) => ({ ...c, openAmount: Math.round(c.openAmount * 100) / 100 }))
    .sort((a, b) => b.openAmount - a.openAmount);

  return { rows, totals, byCustomer };
}
