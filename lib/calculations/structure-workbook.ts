/**
 * `3. AHU-Structure` workbook geometry for golden dims (C2/D2/E2) matching
 * `excel-formulas-dump.json` — sums align with oracle **N60** / **O60** when
 * material prices match column **M** on that sheet.
 */

import type { CalcLineItem, MaterialPrice } from "./types";
import { finite, findMaterial } from "./types";

/** Rows 38–41 — also emitted by `calculateDrainPan`; omitted from `calculateStructure` totals. */
export const STRUCTURE_ROWS_MOVED_TO_DRAIN_PAN_MODULE = new Set([
  "Drain Pan#1 (W)",
  "Drain Pan L/R Support (W)",
  "Drain Pan L/R Pillar",
  "Coil Support",
]);

const GI_DENSITY = 7860;
const SS304_DENSITY = 8800;
const MOTOR_STOPPER_DENSITY = 7980;

/** `D13` on structure sheet (Top depth reference), mm */
const TOP_PANEL_DEPTH_MM = 800;

const GI_CODE = "SGCC-1.5";
const SS304_CODE = "SUS304-1.5";
/** Fallback pricing for threaded shaft row when no catalog row exists */
const SS316_SHAFT_CODE = "SS316-SHAFT-M12";

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

function hStandardMm(cMm: number, dMm: number, eMm: number, fDensity: number): number {
  return finite((cMm / 1000) * (dMm / 1000) * (eMm / 1000) * fDensity, 0);
}

/** Full sheet mass oracle (**N60**) — all contributing rows including drain block 38–41. */
export function structureSheetOracleNutKg(H: number, W: number, D: number): number {
  const lines = buildStructureWorkbookLinesInternal(H, W, D, {
    giPricePerKg: 1,
    ss304PricePerKg: 1,
    steelChannelPricePerKg: 1,
    motorRail316PricePerKg: 1,
    motorStopper316PricePerKg: 1,
    threadedShaftPricePerKg: 1,
  });
  return finite(lines.reduce((s, it) => s + it.qty, 0), 0);
}

/** Mass for rows kept in `calculateStructure` (excludes rows delegated to `calculateDrainPan`). */
export function structureShellNutMassKg(H: number, W: number, D: number): number {
  const lines = buildStructureWorkbookLinesInternal(H, W, D, {
    giPricePerKg: 1,
    ss304PricePerKg: 1,
    steelChannelPricePerKg: 1,
    motorRail316PricePerKg: 1,
    motorStopper316PricePerKg: 1,
    threadedShaftPricePerKg: 1,
  }).filter((it) => !STRUCTURE_ROWS_MOVED_TO_DRAIN_PAN_MODULE.has(it.description));
  return finite(lines.reduce((s, it) => s + it.qty, 0), 0);
}

type ResolvedPrices = {
  giPricePerKg: number;
  ss304PricePerKg: number;
  steelChannelPricePerKg: number;
  motorRail316PricePerKg: number;
  motorStopper316PricePerKg: number;
  threadedShaftPricePerKg: number;
};

function resolvePrices(materials: MaterialPrice[]): ResolvedPrices {
  const gi =
    findMaterial(materials, GI_CODE) ?? findMaterial(materials, "SGCC-1.0");
  const ss = findMaterial(materials, SS304_CODE);
  const shaft = findMaterial(materials, SS316_SHAFT_CODE);
  const unp = findMaterial(materials, "UNP125-304");

  return {
    giPricePerKg: gi ? finite(gi.pricePerKg, 0) : 0,
    ss304PricePerKg: ss ? finite(ss.pricePerKg, 0) : 0,
    steelChannelPricePerKg: finite(
      unp ? finite(unp.pricePerKg, 0) : gi ? finite(gi.pricePerKg, 0) : 0,
      0
    ),
    motorRail316PricePerKg: finite(gi ? finite(gi.pricePerKg, 0) : 0, 0),
    motorStopper316PricePerKg: finite(gi ? finite(gi.pricePerKg, 0) : 0, 0),
    threadedShaftPricePerKg: shaft
      ? finite(shaft.pricePerKg, 0)
      : finite(gi ? finite(gi.pricePerKg, 0) : 0, 0),
  };
}

function pushStdRow(
  items: CalcLineItem[],
  opts: {
    description: string;
    cMm: number;
    dMm: number;
    eMm: number;
    fDensity: number;
    iMult: number;
    k: number;
    l: number;
    pricePerKg: number;
    componentRef: string;
  }
): void {
  const Hraw = hStandardMm(opts.cMm, opts.dMm, opts.eMm, opts.fDensity);
  const J = finite(Hraw * opts.iMult, 0);
  const N = finite(Hraw * opts.k * opts.l, 0);
  const O = finite(J * opts.k * opts.pricePerKg, 0);
  if (N < 1e-12 && O < 1e-6) return;
  items.push(
    line({
      description: opts.description,
      uom: "kg",
      qty: finite(N, 0),
      qtyFormula: `N=H*K*L; H=${opts.cMm}/1000*${opts.dMm}/1000*${opts.eMm}/1000*${opts.fDensity}`,
      unitPrice: N > 1e-12 ? finite(O / N, 0) : 0,
      componentRef: opts.componentRef,
    })
  );
}

function buildStructureWorkbookLinesInternal(
  H: number,
  W: number,
  D: number,
  px: ResolvedPrices
): CalcLineItem[] {
  const C2 = finite(H, 0);
  const D2 = finite(W, 0);
  const E2 = finite(D, 0);

  const C15 = C2 - 100;
  const D15 = D2 - 100;

  const items: CalcLineItem[] = [];

  const giPx = px.giPricePerKg;

  // 24–25 Supply flanges
  pushStdRow(items, {
    description: "Supply flange W (GI)",
    cMm: 1.5,
    dMm: 100,
    eMm: D15,
    fDensity: GI_DENSITY,
    iMult: 1.5,
    k: 2,
    l: 1,
    pricePerKg: giPx,
    componentRef: GI_CODE,
  });
  pushStdRow(items, {
    description: "Supply flange H (GI)",
    cMm: 1.5,
    dMm: 100,
    eMm: C15,
    fDensity: GI_DENSITY,
    iMult: 1.5,
    k: 2,
    l: 1,
    pricePerKg: giPx,
    componentRef: GI_CODE,
  });

  // 26–28 PF filter rails
  const e26 = C2 - 100;
  pushStdRow(items, {
    description: "PF Filter Rail Support (H)",
    cMm: 1.5,
    dMm: 100,
    eMm: e26,
    fDensity: GI_DENSITY,
    iMult: 1.15,
    k: 2,
    l: 1,
    pricePerKg: giPx,
    componentRef: GI_CODE,
  });
  pushStdRow(items, {
    description: "PF Filter Rail Top/Bottom (W)",
    cMm: 1.5,
    dMm: 100,
    eMm: D15,
    fDensity: GI_DENSITY,
    iMult: 1.15,
    k: 2,
    l: 1,
    pricePerKg: giPx,
    componentRef: GI_CODE,
  });
  pushStdRow(items, {
    description: "PF Filter Rail Center (W)",
    cMm: 1.5,
    dMm: 100,
    eMm: D15,
    fDensity: GI_DENSITY,
    iMult: 1.15,
    k: 1,
    l: 1,
    pricePerKg: giPx,
    componentRef: GI_CODE,
  });

  // 29–31 MPF rails (references E26/E27/E28 from workbook rows above)
  pushStdRow(items, {
    description: "MPF Filter Rail Support (H)",
    cMm: 1.5,
    dMm: 100,
    eMm: e26,
    fDensity: GI_DENSITY,
    iMult: 1.15,
    k: 2,
    l: 1,
    pricePerKg: giPx,
    componentRef: GI_CODE,
  });
  const e27 = D15;
  pushStdRow(items, {
    description: "MPF Filter Rail Top/Bottom",
    cMm: 1.5,
    dMm: 75,
    eMm: e27,
    fDensity: GI_DENSITY,
    iMult: 1.15,
    k: 2,
    l: 1,
    pricePerKg: giPx,
    componentRef: GI_CODE,
  });
  pushStdRow(items, {
    description: "MPF Filter Rail Center",
    cMm: 1.5,
    dMm: 75,
    eMm: e27,
    fDensity: GI_DENSITY,
    iMult: 1.15,
    k: 1,
    l: 1,
    pricePerKg: giPx,
    componentRef: GI_CODE,
  });

  // Rows 32–37 intentionally omitted (K=0 / invalid refs → zero contribution in golden dump)

  // 38–41 Drain / coil steel (SS304)
  const ssPx = px.ss304PricePerKg;
  pushStdRow(items, {
    description: "Drain Pan#1 (W)",
    cMm: 1.5,
    dMm: 700,
    eMm: D2,
    fDensity: SS304_DENSITY,
    iMult: 1.15,
    k: 1,
    l: 1,
    pricePerKg: ssPx,
    componentRef: SS304_CODE,
  });
  pushStdRow(items, {
    description: "Drain Pan L/R Support (W)",
    cMm: 1.5,
    dMm: 200,
    eMm: D15,
    fDensity: SS304_DENSITY,
    iMult: 1.15,
    k: 2,
    l: 1,
    pricePerKg: ssPx,
    componentRef: SS304_CODE,
  });
  pushStdRow(items, {
    description: "Drain Pan L/R Pillar",
    cMm: 2.5,
    dMm: 80,
    eMm: 180,
    fDensity: SS304_DENSITY,
    iMult: 1.15,
    k: 6,
    l: 1,
    pricePerKg: ssPx,
    componentRef: SS304_CODE,
  });
  pushStdRow(items, {
    description: "Coil Support",
    cMm: 2.5,
    dMm: 80,
    eMm: 750,
    fDensity: SS304_DENSITY,
    iMult: 1.15,
    k: 6,
    l: 1,
    pricePerKg: ssPx,
    componentRef: SS304_CODE,
  });

  // 42–44 casing extras
  pushStdRow(items, {
    description: "Top",
    cMm: 1.5,
    dMm: 300,
    eMm: TOP_PANEL_DEPTH_MM,
    fDensity: GI_DENSITY,
    iMult: 1.15,
    k: 1,
    l: 1,
    pricePerKg: giPx,
    componentRef: GI_CODE,
  });
  pushStdRow(items, {
    description: "Side",
    cMm: 1.5,
    dMm: 200,
    eMm: 300,
    fDensity: GI_DENSITY,
    iMult: 2.15,
    k: 2,
    l: 1,
    pricePerKg: giPx,
    componentRef: GI_CODE,
  });
  pushStdRow(items, {
    description: "Partition (H x W)",
    cMm: 1.5,
    dMm: C2,
    eMm: D2,
    fDensity: GI_DENSITY,
    iMult: 1.15,
    k: 1,
    l: 1,
    pricePerKg: giPx,
    componentRef: GI_CODE,
  });

  const chPx = px.steelChannelPricePerKg;

  // 45–48 UNP channels
  pushStdRow(items, {
    description: "Base Channel-UNP125 L/R (W)",
    cMm: 2.5,
    dMm: 130,
    eMm: D2,
    fDensity: GI_DENSITY,
    iMult: 1.15,
    k: 2,
    l: 1,
    pricePerKg: chPx,
    componentRef: "UNP125-304",
  });
  pushStdRow(items, {
    description: "Blower/Motor Channel-UNP125 F/B",
    cMm: 2.5,
    dMm: 130,
    eMm: D2 * 0.6,
    fDensity: GI_DENSITY,
    iMult: 2.15,
    k: 2,
    l: 1,
    pricePerKg: chPx,
    componentRef: "UNP125-304",
  });
  pushStdRow(items, {
    description: "Blower Support-UNP125 L/R (D)",
    cMm: 2.5,
    dMm: 100,
    eMm: E2 * 0.6,
    fDensity: GI_DENSITY,
    iMult: 2.15,
    k: 2,
    l: 1,
    pricePerKg: chPx,
    componentRef: "UNP125-304",
  });
  pushStdRow(items, {
    description: "Motor Support-UNP125 L/R (D)",
    cMm: 2.5,
    dMm: 100,
    eMm: E2 * 0.6,
    fDensity: GI_DENSITY,
    iMult: 2.15,
    k: 2,
    l: 1,
    pricePerKg: chPx,
    componentRef: "UNP125-304",
  });

  // 49 Motor rail 316L
  pushStdRow(items, {
    description: "Motor Rail-316L",
    cMm: 3,
    dMm: 140,
    eMm: 1000,
    fDensity: GI_DENSITY,
    iMult: 1.15,
    k: 2,
    l: 1,
    pricePerKg: px.motorRail316PricePerKg,
    componentRef: GI_CODE,
  });

  // 50 Motor stopper 316L (density 7980)
  pushStdRow(items, {
    description: "Motor Stopper-316L",
    cMm: 3,
    dMm: 50,
    eMm: 50,
    fDensity: MOTOR_STOPPER_DENSITY,
    iMult: 1.15,
    k: 2,
    l: 1,
    pricePerKg: px.motorStopper316PricePerKg,
    componentRef: GI_CODE,
  });

  // 51 Threaded shaft — matches `L51` cylinder fragment × `H51` × `K51`
  const L51 = 2 * (22 / 7) * Math.pow(12 / 2000, 2) * 1 * 8000;
  const H51 = 1000 / 1000;
  const K51 = 2;
  const N51 = finite(H51 * K51 * L51, 0);
  const J51 = finite(H51 * 1, 0);
  const O51 = finite(J51 * K51 * px.threadedShaftPricePerKg, 0);
  items.push(
    line({
      description: "Treaded Shaft M12-316L",
      uom: "kg",
      qty: finite(N51, 0),
      qtyFormula: `H51*K51*L51 (shaft cylinder fragment)`,
      unitPrice: N51 > 1e-12 ? finite(O51 / N51, 0) : 0,
      componentRef: SS316_SHAFT_CODE,
    })
  );

  return items;
}

export function buildStructureWorkbookLines(params: {
  H: number;
  W: number;
  D: number;
  materials: MaterialPrice[];
}): CalcLineItem[] {
  const H = finite(params.H, 0);
  const W = finite(params.W, 0);
  const D = finite(params.D, 0);
  const px = resolvePrices(params.materials);
  return buildStructureWorkbookLinesInternal(H, W, D, px);
}
