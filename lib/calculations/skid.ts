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

/**
 * Workbook `1. AHU-Skid` rows 18–20 (active when second section dims are zero):
 * H = C/1000*D/1000*E/1000*F, J = H*I, costing mass for line = J*K (O = J*K*M).
 */
function skidMassKg(Cmm: number, Dmm: number, Emm: number): number {
  return finite((Cmm / 1000) * (Dmm / 1000) * (Emm / 1000) * STEEL_D, 0);
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

  const I = 1.15;
  const K = 2;

  const rows: Array<{
    desc: string;
    C: number;
    D: number;
    E: number;
  }> = [
    { desc: "UNP100-304 L/R (D)", C: 3, D: 300, E: D },
    { desc: "UNP100-304 F/B (W)", C: 3, D: 300, E: W },
    { desc: "C40-180-40-Center Support (W)", C: 2, D: 260, E: W },
  ];

  return rows.map((r) => {
    const Hvol = skidMassKg(r.C, r.D, r.E);
    const J = finite(Hvol * I, 0);
    const qty = finite(J, 0);
    return line({
      description: r.desc,
      uom: "kg",
      qty,
      qtyFormula: `H*I where H=C/1000*D/1000*E/1000*${STEEL_D}`,
      unitPrice: finite(K * pricePerKg, 0),
      componentRef: UNP_CODE,
      notes: "O=J*K*M with unitPrice=K*M(IDR/kg)",
    });
  });
}
