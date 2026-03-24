import type { CalcLineItem, MaterialPrice } from "./types";
import { finite, findMaterial } from "./types";

const AL_FIN_CODE = "AL-FIN";
const COPPER_CODE = "COPPER-TUBE";
const GI_HEADER_CODE = "SGCC-1.0";
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

export function calculateCoil(params: {
  FH: number;
  FL: number;
  rows: number;
  FPI: number;
  circuits: number;
  materials: MaterialPrice[];
}): CalcLineItem[] {
  const FH = finite(params.FH, 0);
  const FL = finite(params.FL, 0);
  const rows = Math.max(0, Math.floor(finite(params.rows, 0)));
  const FPI = finite(params.FPI, 0);
  const circuits = Math.max(0, Math.floor(finite(params.circuits, 0)));

  const finMat = findMaterial(params.materials, AL_FIN_CODE);
  const cuMat = findMaterial(params.materials, COPPER_CODE);
  const giMat = findMaterial(params.materials, GI_HEADER_CODE);

  const finPrice = finMat ? finite(finMat.pricePerKg, 0) : 0;
  const cuPrice = cuMat ? finite(cuMat.pricePerKg, 0) : 0;
  const giPrice = giMat ? finite(giMat.pricePerKg, 0) : 0;

  const fhM = FH / 1000;
  const flM = FL / 1000;
  const fpiSafe = FPI > 0 ? FPI : 1;

  const kgFin =
    fhM *
    flM *
    (FL / (fpiSafe * 25.4)) *
    0.00011 *
    2700 *
    1.034;

  const tubeCross =
    (Math.PI * (Math.pow(0.009525, 2) - Math.pow(0.008525, 2))) / 4;
  const kgTube =
    tubeCross * rows * circuits * fhM * 8900 * 1.02;

  const kgHeader =
    0.0015 * 0.268 * (fhM + 0.1) * GI_DENSITY * 1.15 * 2;

  return [
    line({
      description: "Coil fin (Al)",
      uom: "kg",
      qty: finite(kgFin, 0),
      qtyFormula: `FH/1000*FL/1000*(FL/(FPI*25.4))*0.00011*2700*1.034`,
      unitPrice: finPrice,
      componentRef: AL_FIN_CODE,
    }),
    line({
      description: "Coil tube (Cu)",
      uom: "kg",
      qty: finite(kgTube, 0),
      qtyFormula: `π*((0.009525²-0.008525²)/4)*rows*circuits*(FH/1000)*8900*1.02`,
      unitPrice: cuPrice,
      componentRef: COPPER_CODE,
    }),
    line({
      description: "Coil header (GI)",
      uom: "kg",
      qty: finite(kgHeader, 0),
      qtyFormula: `0.0015*0.268*(FH/1000+0.1)*${GI_DENSITY}*1.15*2`,
      unitPrice: giPrice,
      componentRef: GI_HEADER_CODE,
    }),
  ];
}
