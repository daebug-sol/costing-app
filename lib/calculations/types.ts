import type {
  ComponentCatalog,
  MaterialPrice,
  ProfileData,
} from "@prisma/client";

export type { ComponentCatalog, MaterialPrice, ProfileData };

/** One calculated row before persisting to CostingLineItem */
export type CalcLineItem = {
  description: string;
  uom: string;
  qty: number;
  qtyFormula?: string | null;
  unitPrice: number;
  currency: string;
  wasteFactor: number;
  subtotal: number;
  componentRef?: string | null;
  notes?: string | null;
};

export function finite(n: unknown, fallback = 0): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

export function findMaterial(
  materials: MaterialPrice[],
  code: string
): MaterialPrice | undefined {
  return materials.find((m) => m.code === code);
}

export function findProfileByCode(
  profiles: ProfileData[],
  code: string
): ProfileData | undefined {
  return profiles.find((p) => p.code === code);
}

export function firstProfileByType(
  profiles: ProfileData[],
  type: string
): ProfileData | undefined {
  return profiles.filter(
    (p) => p.type.toLowerCase() === type.toLowerCase()
  )[0];
}
