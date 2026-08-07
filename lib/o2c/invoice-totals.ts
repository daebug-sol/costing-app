import Decimal from "decimal.js";
import { finite } from "@/lib/calculations";

export type InvoiceTotalsInput = {
  lineTotals: number[];
  /** Discount percent (e.g. 5 = 5%). */
  discountPct?: number;
  /** Absolute discount amount (applied after pct if both set — pct first). */
  discountAmt?: number;
  /** PPN percent (e.g. 11). */
  ppnPct?: number;
  /** PPH percent on DPP (optional). */
  pphPct?: number;
};

export type InvoiceTotals = {
  subtotal: number;
  discountPct: number;
  discountAmt: number;
  dpp: number;
  ppn: number;
  pph: number;
  grandTotal: number;
};

function money(d: Decimal): number {
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Server-side invoice totals with Decimal rounding (2 dp).
 * DPP = subtotal − discount; grandTotal = DPP + PPN + PPH.
 */
export function computeInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const subtotal = input.lineTotals.reduce(
    (s, x) => s.plus(finite(x, 0)),
    new Decimal(0)
  );
  const discountPct = finite(input.discountPct, 0);
  const discountAmtInput = finite(input.discountAmt, 0);
  const ppnPct = finite(input.ppnPct, 0);
  const pphPct = finite(input.pphPct, 0);

  const fromPct = subtotal.times(discountPct).div(100);
  const discountAmt = Decimal.min(
    subtotal,
    fromPct.plus(discountAmtInput)
  );
  const dpp = Decimal.max(0, subtotal.minus(discountAmt));
  const ppn = dpp.times(ppnPct).div(100);
  const pph = dpp.times(pphPct).div(100);
  const grandTotal = dpp.plus(ppn).plus(pph);

  return {
    subtotal: money(subtotal),
    discountPct,
    discountAmt: money(discountAmt),
    dpp: money(dpp),
    ppn: money(ppn),
    pph: money(pph),
    grandTotal: money(grandTotal),
  };
}

export function invoiceStatusFromPaid(
  grandTotal: number,
  paidTotal: number,
  current: string
): string {
  const cur = (current ?? "").trim().toLowerCase();
  if (cur === "void" || cur === "draft") return cur;
  const gt = finite(grandTotal, 0);
  const paid = finite(paidTotal, 0);
  if (paid <= 0) return "sent";
  if (paid + 0.01 >= gt) return "paid";
  return "partially_paid";
}
