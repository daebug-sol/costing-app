import { prisma } from "@/lib/prisma";
import { computeQuotationTotals } from "@/lib/quotation-financials";

/** Recompute header totals from line items and discount/PPN/PPH flags. */
export async function recalcQuotationTotalsById(quotationId: string) {
  const q = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!q) return;

  const itemsRows = await prisma.quotationItem.findMany({
    where: { quotationId },
    orderBy: { sortOrder: "asc" },
  });

  const lineTotals = itemsRows.map((it) => it.totalPrice);
  const discountEff = q.discountEnabled ? q.discount : 0;
  const ppnEff = q.ppnEnabled ? q.ppn : 0;
  const totals = computeQuotationTotals(lineTotals, discountEff, ppnEff, {
    pphEnabled: q.pphEnabled,
    pphPercent: q.pphRate,
  });

  await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      totalBeforeDisc: totals.totalBeforeDisc,
      totalAfterDisc: totals.totalAfterDisc,
      totalPPN: totals.totalPPN,
      totalPPH: totals.totalPPH,
      grandTotal: totals.grandTotal,
    },
  });
}
