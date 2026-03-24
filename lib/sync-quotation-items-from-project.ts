import { finite } from "@/lib/calculations";
import { prisma } from "@/lib/prisma";
import { recalcQuotationTotalsById } from "@/lib/recalc-quotation-totals-db";

/**
 * Refresh QT line prices from latest CostingProject.totalSelling for all
 * quotation items linked to this project (e.g. after finalize / recalc).
 */
export async function syncQuotationItemsFromProject(projectId: string) {
  const proj = await prisma.costingProject.findUnique({
    where: { id: projectId },
  });
  if (!proj) return;

  const items = await prisma.quotationItem.findMany({
    where: { projectId },
  });
  if (items.length === 0) return;

  const unitPrice = finite(proj.totalSelling, 0);

  for (const it of items) {
    const qty = Math.max(1, Math.floor(Math.abs(it.qty)) || 1);
    await prisma.quotationItem.update({
      where: { id: it.id },
      data: {
        unitPrice,
        totalPrice: qty * unitPrice,
      },
    });
  }

  const quotationIds = [...new Set(items.map((i) => i.quotationId))];
  for (const qid of quotationIds) {
    await recalcQuotationTotalsById(qid);
  }
}
