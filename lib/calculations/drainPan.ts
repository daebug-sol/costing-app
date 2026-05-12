import type { CalcLineItem, MaterialPrice } from "./types";
import { finite, findMaterial } from "./types";

const SUS304_CODE = "SUS304-1.5";
const SS304_DENSITY = 8800;

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

function hStd(cMm: number, dMm: number, eMm: number): number {
  return finite((cMm / 1000) * (dMm / 1000) * (eMm / 1000) * SS304_DENSITY, 0);
}

/**
 * SS304 drain assembly — `3. AHU-Structure` rows 38–41 (matches oracle when dims/prices align).
 */
export function calculateDrainPan(params: {
  H: number;
  W: number;
  D: number;
  materials: MaterialPrice[];
}): CalcLineItem[] {
  finite(params.H, 0);
  const W = finite(params.W, 0);
  const D = finite(params.D, 0);

  const ss = findMaterial(params.materials, SUS304_CODE);
  const ssPrice = ss ? finite(ss.pricePerKg, 0) : 0;

  const D2 = W;
  const D15 = W - 100;

  const items: CalcLineItem[] = [];

  const pushRow = (opts: {
    description: string;
    cMm: number;
    dMm: number;
    eMm: number;
    iMult: number;
    k: number;
    l: number;
  }) => {
    const Hraw = hStd(opts.cMm, opts.dMm, opts.eMm);
    const J = finite(Hraw * opts.iMult, 0);
    const N = finite(Hraw * opts.k * opts.l, 0);
    const O = finite(J * opts.k * ssPrice, 0);
    items.push(
      line({
        description: opts.description,
        uom: "kg",
        qty: finite(N, 0),
        qtyFormula: `${opts.cMm}/1000*${opts.dMm}/1000*${opts.eMm}/1000*${SS304_DENSITY}*${opts.k}*${opts.l}`,
        unitPrice: N > 1e-12 ? finite(O / N, 0) : 0,
        componentRef: SUS304_CODE,
      })
    );
  };

  void D;

  pushRow({
    description: "Drain Pan#1 (W)",
    cMm: 1.5,
    dMm: 700,
    eMm: D2,
    iMult: 1.15,
    k: 1,
    l: 1,
  });
  pushRow({
    description: "Drain Pan L/R Support (W)",
    cMm: 1.5,
    dMm: 200,
    eMm: D15,
    iMult: 1.15,
    k: 2,
    l: 1,
  });
  pushRow({
    description: "Drain Pan L/R Pillar",
    cMm: 2.5,
    dMm: 80,
    eMm: 180,
    iMult: 1.15,
    k: 6,
    l: 1,
  });
  pushRow({
    description: "Coil Support",
    cMm: 2.5,
    dMm: 80,
    eMm: 750,
    iMult: 1.15,
    k: 6,
    l: 1,
  });

  return items;
}
