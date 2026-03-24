import type { CalcLineItem, MaterialPrice } from "./types";
import { finite, findMaterial } from "./types";

const SUS304_CODE = "SUS304-1.5";
const GI_DENSITY = 8030;

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

export function calculateStructure(params: {
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
  const giMat =
    findMaterial(params.materials, "SGCC-1.5") ??
    findMaterial(params.materials, "SGCC-1.0");
  const giPrice = giMat ? finite(giMat.pricePerKg, 0) : 0;

  const dM = D / 1000;
  const wM = W / 1000;
  const hM = H / 1000;

  const kgDrainPan =
    0.0015 * wM * (dM + 0.15) * 8800 * 1.15;
  const kgDrainSupport =
    0.0015 * 0.2 * wM * 8800 * 1.15 * 2;
  const kgSupFlangeW =
    0.0015 * 0.1 * wM * GI_DENSITY * 1.15 * 2;
  const kgSupFlangeH =
    0.0015 * 0.1 * hM * GI_DENSITY * 1.15 * 2;
  const kgFanPart =
    0.0015 * hM * wM * GI_DENSITY * 1.15;
  const kgFilterH =
    0.0015 * 0.1 * hM * GI_DENSITY * 1.15 * 4;
  const kgFilterW =
    0.0015 * 0.1 * wM * GI_DENSITY * 1.15 * 4;

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
    line({
      description: "Supply flange W (GI)",
      uom: "kg",
      qty: finite(kgSupFlangeW, 0),
      qtyFormula: `0.0015*0.1*(${W}/1000)*${GI_DENSITY}*1.15*2`,
      unitPrice: giPrice,
      componentRef: giMat?.code ?? "SGCC",
    }),
    line({
      description: "Supply flange H (GI)",
      uom: "kg",
      qty: finite(kgSupFlangeH, 0),
      qtyFormula: `0.0015*0.1*(${H}/1000)*${GI_DENSITY}*1.15*2`,
      unitPrice: giPrice,
      componentRef: giMat?.code ?? "SGCC",
    }),
    line({
      description: "Fan partition (GI)",
      uom: "kg",
      qty: finite(kgFanPart, 0),
      qtyFormula: `0.0015*(${H}/1000)*(${W}/1000)*${GI_DENSITY}*1.15`,
      unitPrice: giPrice,
      componentRef: giMat?.code ?? "SGCC",
    }),
    line({
      description: "Filter rail H (GI)",
      uom: "kg",
      qty: finite(kgFilterH, 0),
      qtyFormula: `0.0015*0.1*(${H}/1000)*${GI_DENSITY}*1.15*4`,
      unitPrice: giPrice,
      componentRef: giMat?.code ?? "SGCC",
    }),
    line({
      description: "Filter rail W (GI)",
      uom: "kg",
      qty: finite(kgFilterW, 0),
      qtyFormula: `0.0015*0.1*(${W}/1000)*${GI_DENSITY}*1.15*4`,
      unitPrice: giPrice,
      componentRef: giMat?.code ?? "SGCC",
    }),
  ];
}
