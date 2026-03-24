import { prisma } from "@/lib/prisma";
import { finite } from "@/lib/calculations";
import { rollupProjectFinancials } from "@/lib/project-rollup";

type ManualRow = {
  id: string;
  qty: number;
  basePrice: number;
  overridePrice: number | null;
  wasteFactor: number;
};

function lineSubtotal(row: ManualRow): number {
  const eff = finite(row.overridePrice ?? row.basePrice, 0);
  return finite(row.qty, 0) * eff * finite(row.wasteFactor, 1);
}

/** Recompute manual items + groups + segment.subtotal + project rollup. */
export async function rollupManualSegmentFinancials(segmentId: string) {
  const seg = await prisma.costingSegment.findUnique({
    where: { id: segmentId },
    include: {
      project: true,
      manualGroups: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!seg || seg.type !== "manual") return;

  await prisma.$transaction(async (tx) => {
    for (const g of seg.manualGroups) {
      for (const it of g.items) {
        const eff = finite(it.overridePrice ?? it.basePrice, 0);
        const sub = lineSubtotal({
          id: it.id,
          qty: it.qty,
          basePrice: it.basePrice,
          overridePrice: it.overridePrice,
          wasteFactor: it.wasteFactor,
        });
        await tx.manualCostingItem.update({
          where: { id: it.id },
          data: {
            effectivePrice: eff,
            subtotal: sub,
          },
        });
      }
    }
  });

  const refreshed = await prisma.costingSegment.findUnique({
    where: { id: segmentId },
    include: {
      manualGroups: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!refreshed) return;

  let segmentSub = 0;
  for (const g of refreshed.manualGroups) {
    const sub = g.items.reduce((s, it) => s + finite(it.subtotal, 0), 0);
    segmentSub += sub;
    await prisma.manualCostingGroup.update({
      where: { id: g.id },
      data: { subtotal: sub },
    });
  }

  await prisma.costingSegment.update({
    where: { id: segmentId },
    data: { subtotal: segmentSub },
  });

  await rollupProjectFinancials(seg.projectId);
}

export async function ensureDefaultUmumGroup(segmentId: string): Promise<string> {
  const existing = await prisma.manualCostingGroup.findFirst({
    where: { segmentId, name: "Umum" },
  });
  if (existing) return existing.id;

  const maxOrder = await prisma.manualCostingGroup.aggregate({
    where: { segmentId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
  const g = await prisma.manualCostingGroup.create({
    data: { segmentId, name: "Umum", sortOrder },
  });
  return g.id;
}
