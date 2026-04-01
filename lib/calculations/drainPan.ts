import type { CalcLineItem, MaterialPrice } from "./types";
import { finite, findMaterial } from "./types";

const SUS304_CODE = "SUS304-1.5";

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

/** SS304 drain pan + support (same formulas as legacy `calculateStructure` drain rows). */
export function calculateDrainPan(params: {
  H: number;
  W: number;
  D: number;
  materials: MaterialPrice[];
}): CalcLineItem[] {
  const H = finite(params.H, 0);
  const W = finite(params.W, 0);
  const D = finite(params.D, 0);

  const ss = findMaterial(params.materials, SUS304_CODE);
  const ssPrice = ss ? finite(ss.pricePerKg, 0) : 0;

  const dM = D / 1000;
  const wM = W / 1000;

  const kgDrainPan =
    0.0015 * wM * (dM + 0.15) * 8800 * 1.15;
  const kgDrainSupport =
    0.0015 * 0.2 * wM * 8800 * 1.15 * 2;

  return [
    line({
      description: "Drain pan SS304",
      uom: "kg",
      qty: finite(kgDrainPan, 0),
      qtyFormula: `0.0015*(${W}/1000)*(${D}/1000+0.15)*8800*1.15`,
      unitPrice: ssPrice,
      componentRef: SUS304_CODE,
    }),
    line({
      description: "Drain pan support SS304",
      uom: "kg",
      qty: finite(kgDrainSupport, 0),
      qtyFormula: `0.0015*0.2*(${W}/1000)*8800*1.15*2`,
      unitPrice: ssPrice,
      componentRef: SUS304_CODE,
    }),
  ];
}
