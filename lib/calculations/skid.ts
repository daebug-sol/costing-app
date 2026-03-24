import type { CalcLineItem, MaterialPrice } from "./types";
import { finite, findMaterial } from "./types";

const UNP_CODE = "UNP100-304";
const STEEL_D = 7860;

function line(
  partial: Omit<CalcLineItem, "currency" | "wasteFactor" | "subtotal"> & {
    currency?: string;
    wasteFactor?: number;
  }
): CalcLineItem {
  const currency = partial.currency ?? "IDR";
  const wasteFactor = finite(partial.wasteFactor, 1);
  const qty = finite(partial.qty, 0);
  const unitPrice = finite(partial.unitPrice, 0);
  const subtotal = finite(qty * unitPrice * wasteFactor, 0);
  return {
    description: partial.description,
    uom: partial.uom,
    qty,
    qtyFormula: partial.qtyFormula ?? String(qty),
    unitPrice,
    currency,
    wasteFactor,
    subtotal,
    componentRef: partial.componentRef ?? null,
    notes: partial.notes ?? null,
  };
}

export function calculateSkid(params: {
  W: number;
  D: number;
  materials: MaterialPrice[];
}): CalcLineItem[] {
  const W = finite(params.W, 0);
  const D = finite(params.D, 0);
  const mat = findMaterial(params.materials, UNP_CODE);
  const pricePerKg = mat ? finite(mat.pricePerKg, 0) : 0;

  const kgLR =
    0.003 * 0.1 * (D / 1000) * STEEL_D * 1.15 * 2;
  const kgFB =
    0.003 * 0.1 * (W / 1000) * STEEL_D * 1.15 * 2;
  const kgCenter =
    0.002 * 0.08 * (W / 1000) * STEEL_D * 1.15 * 2;

  const items: CalcLineItem[] = [
    line({
      description: "UNP100 L/R skid (D direction)",
      uom: "kg",
      qty: finite(kgLR, 0),
      qtyFormula: `0.003*0.1*(${D}/1000)*${STEEL_D}*1.15*2`,
      unitPrice: pricePerKg,
      componentRef: UNP_CODE,
    }),
    line({
      description: "UNP100 F/B skid (W direction)",
      uom: "kg",
      qty: finite(kgFB, 0),
      qtyFormula: `0.003*0.1*(${W}/1000)*${STEEL_D}*1.15*2`,
      unitPrice: pricePerKg,
      componentRef: UNP_CODE,
    }),
    line({
      description: "Center support (W)",
      uom: "kg",
      qty: finite(kgCenter, 0),
      qtyFormula: `0.002*0.08*(${W}/1000)*${STEEL_D}*1.15*2`,
      unitPrice: pricePerKg,
      componentRef: UNP_CODE,
    }),
  ];

  return items;
}
