import { finite } from "@/lib/calculations";

export type OpenInvoice = {
  id: string;
  grandTotal: number;
  paidTotal: number;
  dueDate: Date | string | null;
};

export type AllocationLine = {
  invoiceId: string;
  amount: number;
};

/**
 * FIFO allocate `amount` across open invoices sorted by dueDate then id.
 */
export function fifoAllocate(
  openInvoices: OpenInvoice[],
  amount: number
): AllocationLine[] {
  const budget = finite(amount, 0);
  if (budget <= 0) return [];

  const sorted = [...openInvoices].sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });

  const lines: AllocationLine[] = [];
  let remaining = budget;
  for (const inv of sorted) {
    if (remaining <= 0) break;
    const open = Math.max(0, finite(inv.grandTotal, 0) - finite(inv.paidTotal, 0));
    if (open <= 0) continue;
    const take = Math.min(open, remaining);
    lines.push({ invoiceId: inv.id, amount: Math.round(take * 100) / 100 });
    remaining = Math.round((remaining - take) * 100) / 100;
  }
  return lines;
}

/**
 * Validate explicit allocations: sum ≤ payment amount, each ≤ invoice open balance.
 */
export function validateAllocations(
  paymentAmount: number,
  openInvoices: OpenInvoice[],
  allocations: AllocationLine[]
): { ok: true; total: number } | { ok: false; error: string } {
  const byId = new Map(openInvoices.map((i) => [i.id, i]));
  let total = 0;
  for (const a of allocations) {
    const amt = finite(a.amount, 0);
    if (amt <= 0) {
      return { ok: false, error: "Jumlah alokasi harus lebih dari 0" };
    }
    const inv = byId.get(a.invoiceId);
    if (!inv) {
      return { ok: false, error: `Invoice tidak terbuka: ${a.invoiceId}` };
    }
    const open = Math.max(0, finite(inv.grandTotal, 0) - finite(inv.paidTotal, 0));
    if (amt > open + 0.01) {
      return {
        ok: false,
        error: `Alokasi melebihi sisa invoice (${open})`,
      };
    }
    total += amt;
  }
  total = Math.round(total * 100) / 100;
  const pay = finite(paymentAmount, 0);
  if (total > pay + 0.01) {
    return {
      ok: false,
      error: `Total alokasi (${total}) melebihi jumlah pembayaran (${pay})`,
    };
  }
  return { ok: true, total };
}
