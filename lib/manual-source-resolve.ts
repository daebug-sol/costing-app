import { prisma } from "@/lib/prisma";

export type ResolvedManualSource = {
  code: string;
  name: string;
  category: string;
  uom: string;
  basePrice: number;
};

export async function resolveManualSource(
  sourceType: string,
  sourceId: string
): Promise<ResolvedManualSource | null> {
  if (sourceType === "material") {
    const m = await prisma.materialPrice.findUnique({
      where: { id: sourceId },
    });
    if (!m) return null;
    return {
      code: m.code,
      name: m.name,
      category: m.category,
      uom: m.unit,
      basePrice: m.pricePerKg,
    };
  }
  if (sourceType === "profile") {
    const p = await prisma.profileData.findUnique({
      where: { id: sourceId },
    });
    if (!p) return null;
    return {
      code: p.code,
      name: p.name,
      category: p.type,
      uom: "m",
      basePrice: p.pricePerM,
    };
  }
  if (sourceType === "component") {
    const c = await prisma.componentCatalog.findUnique({
      where: { id: sourceId },
    });
    if (!c) return null;
    return {
      code: c.code,
      name: c.name,
      category: c.category,
      uom: c.unit,
      basePrice: c.unitPrice,
    };
  }
  return null;
}
