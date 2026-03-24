import { finite } from "@/lib/calculations";

export type QuotationTotals = {
  totalBeforeDisc: number;
  totalAfterDisc: number;
  totalPPN: number;
  totalPPH: number;
  grandTotal: number;
};

/** `discountPercent`, `ppnPercent`, `pphPercent` are percentage values (e.g. 11 = 11%). */
export function computeQuotationTotals(
  lineTotals: number[],
  discountPercent: number,
  ppnPercent: number,
  opts?: { pphEnabled?: boolean; pphPercent?: number }
): QuotationTotals {
  const subtotal = lineTotals.reduce((s, x) => s + finite(x, 0), 0);
  const dPct = finite(discountPercent, 0);
  const discountAmount = subtotal * (dPct / 100);
  const afterDisc = Math.max(0, subtotal - discountAmount);
  const ppnAmount = afterDisc * (finite(ppnPercent, 0) / 100);
  const pphAmount =
    opts?.pphEnabled === true
      ? afterDisc * (finite(opts.pphPercent ?? 0, 0) / 100)
      : 0;
  const grandTotal = afterDisc + ppnAmount + pphAmount;
  return {
    totalBeforeDisc: subtotal,
    totalAfterDisc: afterDisc,
    totalPPN: ppnAmount,
    totalPPH: pphAmount,
    grandTotal,
  };
}
