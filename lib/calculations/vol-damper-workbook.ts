/**
 * VolDamper FA/RA workbook model (rows 50–58): geometry from C43/P43, catalog VLOOKUP,
 * mass O = L×M×N, line cost S = O×R. Matches `VolDamperCost2023 *` in `excel-formulas-dump.json`.
 */

import Decimal from "decimal.js";
import type { CalcLineItem } from "./types";
import { finite } from "./types";
import { d, excelRoundDown } from "./excel-math";

/** Col E (VLOOKUP …,4) and col F (VLOOKUP …,5) from `$B$7:$S$40` — snapshot aligned with dump. */
const VOL_DAMPER_CATALOG: Record<string, { factor: number; unitPriceIdr: number }> = {
  SPHC: { factor: 7700, unitPriceIdr: 18000 },
  SGCC: { factor: 8030, unitPriceIdr: 30000 },
  SUS304: { factor: 7800, unitPriceIdr: 55000 },
  SUS36L: { factor: 8000, unitPriceIdr: 55000 },
  Al6065: { factor: 2720, unitPriceIdr: 83085 },
  ET6065: { factor: 1, unitPriceIdr: 78000 },
  SH5037: { factor: 1.032, unitPriceIdr: 86114.208 },
  SH5038: { factor: 1.4, unitPriceIdr: 109200 },
  SH5039: { factor: 1.759, unitPriceIdr: 214624.38499999998 },
  SH5040: { factor: 0.85, unitPriceIdr: 69353.625 },
  GA100: { factor: 0.03735, unitPriceIdr: 2454.75 },
  AC004: { factor: 0.12, unitPriceIdr: 20355.000000000004 },
  AC003: { factor: 0.37, unitPriceIdr: 117990 },
  PMS80: { factor: 0.715, unitPriceIdr: 94500 },
  "2Nm": { factor: 0.5, unitPriceIdr: 0 },
  "5Nm": { factor: 0.5, unitPriceIdr: 0 },
  "10Nm": { factor: 0.5, unitPriceIdr: 0 },
  "20Nm": { factor: 0.9, unitPriceIdr: 0 },
  "30Nm": { factor: 1.4, unitPriceIdr: 0 },
  "40Nm": { factor: 1.4, unitPriceIdr: 0 },
};

const ZERO_FGH = { f: 0, g: 0, h: 0 };

const ROW_CODES: Record<
  number,
  { code: string; immForK?: "p43PlusRail" | "q43" | "q45" | "fixed150" | "torqueLabel" }
> = {
  50: { code: "SH5037", immForK: "p43PlusRail" },
  51: { code: "SH5038", immForK: "q43" },
  52: { code: "SH5039", immForK: "q43" },
  53: { code: "SH5040", immForK: "q45" },
  54: { code: "GA100", immForK: "q45" },
  55: { code: "PMS80", immForK: "fixed150" },
  56: { code: "AC004" },
  57: { code: "AC003" },
  58: { code: "2Nm", immForK: "torqueLabel" },
};

function damperVerticalProfileCountFromP43(p43Mm: Decimal.Value): Decimal {
  const p = d(p43Mm);
  if (p.lte(1400)) return d(0);
  if (p.gt(1400) && p.lte(2100)) return d(1);
  return d(2);
}

function damperActuatorTorqueLabelFromAreaM2(p46: Decimal.Value): string {
  const a = d(p46);
  if (a.lt(0.5)) return "2Nm";
  if (a.gt(0.5) && a.lt(1)) return "5Nm";
  if (a.gt(1) && a.lt(2)) return "10Nm";
  if (a.gt(2) && a.lt(4)) return "20Nm";
  if (a.gt(4) && a.lt(6)) return "30Nm";
  if (a.gt(6) && a.lt(8)) return "40Nm";
  return "NA";
}

/** Excel `K` column volume / length helper (F/G/H in mm, I in mm where used). */
export function volDamperRowK_m3(opts: {
  Fmm: number;
  Gmm: number;
  Hmm: number;
  Imm: number;
}): Decimal {
  const F = opts.Fmm;
  const G = opts.Gmm;
  const H = opts.Hmm;
  const I = opts.Imm;
  if (F > 0) {
    return d(22 / 28)
      .mul(d(F / 1000).pow(2).minus(d(F / 1000).minus(d(2 * G).div(1000)).pow(2)))
      .mul(H / 1000);
  }
  if (G > 0) return d(G / 1000).mul(H / 1000).mul(I / 1000);
  if (H > 0) return d(H / 1000).mul(I / 1000);
  if (I === 0) return d(1);
  return d(I).div(1000);
}

/** Blade row 53: third branch may use `Q45` (mm) as length input. */
function volDamperBladeRowK_m3(opts: {
  Fmm: number;
  Gmm: number;
  Hmm: number;
  Q45mm: number;
}): Decimal {
  const F = opts.Fmm;
  const G = opts.Gmm;
  const H = opts.Hmm;
  const Q45 = opts.Q45mm;
  if (F > 0) {
    return d(22 / 28)
      .mul(d(F / 1000).pow(2).minus(d(F / 1000).minus(d(2 * G).div(1000)).pow(2)))
      .mul(H / 1000);
  }
  if (G > 0) return d(G / 1000).mul(H / 1000).mul(Q45 / 1000);
  if (H > 0) return d(H / 1000).mul(Q45 / 1000);
  if (Q45 === 0) return d(1);
  return d(Q45).div(1000);
}

function lookupCatalog(code: string): { factor: number; unitPriceIdr: number } {
  const row = VOL_DAMPER_CATALOG[code];
  if (!row) return { factor: 0, unitPriceIdr: 0 };
  return row;
}

export type VolDamperGeometry = {
  p44: Decimal;
  q43: Decimal;
  q44: Decimal;
  p45: Decimal;
  q45: Decimal;
  p46: Decimal;
  torqueLabel: string;
};

export function volDamperGeometryFromOpenings(openingWidthMm: number, openingHeightMm: number): VolDamperGeometry {
  const c43 = d(openingWidthMm);
  const p43 = d(openingHeightMm);
  const p44 = excelRoundDown(c43.div(100), 0);
  const q43 = p44.mul(100).add(10);
  const q44 = damperVerticalProfileCountFromP43(p43);
  const p45 = p44.mul(q44.add(1));
  const q45 = p43.minus(q44.mul(34.3)).div(q44.add(1));
  const p46 = q43.div(1000).mul(p43.div(1000));
  const torqueLabel = damperActuatorTorqueLabelFromAreaM2(p46);
  return { p44, q43, q44, p45, q45, p46, torqueLabel };
}

function rowImmMm(row: number, g: VolDamperGeometry, p43Num: number): number {
  const spec = ROW_CODES[row];
  if (!spec?.immForK) return 0;
  switch (spec.immForK) {
    case "p43PlusRail":
      return p43Num + 34.4 * 2;
    case "q43":
      return g.q43.toNumber();
    case "q45":
      return g.q45.toNumber();
    case "fixed150":
      return 150;
    case "torqueLabel":
      return 0;
    default:
      return 0;
  }
}

function resolveRowCode(row: number, torqueLabel: string): string {
  if (row === 58) return torqueLabel;
  return ROW_CODES[row]?.code ?? "";
}

function kForRow(row: number, g: VolDamperGeometry, p43Num: number): Decimal {
  const imm = rowImmMm(row, g, p43Num);
  if (row === 53) {
    return volDamperBladeRowK_m3({
      Fmm: ZERO_FGH.f,
      Gmm: ZERO_FGH.g,
      Hmm: ZERO_FGH.h,
      Q45mm: g.q45.toNumber(),
    });
  }
  return volDamperRowK_m3({
    Fmm: ZERO_FGH.f,
    Gmm: ZERO_FGH.g,
    Hmm: ZERO_FGH.h,
    Imm: imm,
  });
}

function nForRow(row: number, g: VolDamperGeometry, b44: number, p46n: number): Decimal {
  if (row === 50 || row === 51) return d(2);
  if (row === 52) return g.q44;
  if (row === 53) return g.p45;
  if (row === 54) return g.p45.mul(2).add(d(p46n + 1).mul(2));
  if (row === 55) return d(b44 === 1 ? 1 : 0);
  if (row === 56) return g.p45;
  if (row === 57) return d(b44 === 0 ? 1 : 0);
  if (row === 58) return d(b44 === 1 ? 1 : 0);
  return d(0);
}

/**
 * Line items mirroring VolDamper rows 50–58 (one `CalcLineItem` per row).
 * `qty` = O, `unitPrice` = R (`VLOOKUP` col 5), `subtotal` ≈ S = O×R.
 */
export function calculateVolDamperWorkbookLines(params: {
  /** Workbook `C43` (mm). */
  openingWidthMm: number;
  /** Workbook `P43` (mm). */
  openingHeightMm: number;
  /** Workbook `B71` → `B44` damper mode flag (0/1). */
  b44?: number;
  type: "FA" | "RA";
}): CalcLineItem[] {
  const Wmm = finite(params.openingWidthMm, 0);
  const Hmm = finite(params.openingHeightMm, 0);
  const b44 = Math.floor(finite(params.b44 ?? 0, 0)) === 1 ? 1 : 0;
  const g = volDamperGeometryFromOpenings(Wmm, Hmm);
  const p43Num = Hmm;
  const p46n = g.p46.toNumber();
  const torqueLabel = g.torqueLabel;

  const jDefault = 1;
  const items: CalcLineItem[] = [];

  for (let row = 50; row <= 58; row += 1) {
    const code = resolveRowCode(row, torqueLabel);
    const { factor: pMul, unitPriceIdr: rIdr } = lookupCatalog(code);
    const j = jDefault;
    const kDec = kForRow(row, g, p43Num);
    const l = d(j).mul(kDec);
    const m = row >= 50 && row <= 54 ? 1.05 : 1;
    const n = nForRow(row, g, b44, p46n);

    const o = l.mul(m).mul(n);
    const s = o.mul(rIdr);

    items.push({
      description: `Vol damper ${params.type} row ${row} (${code})`,
      uom: "IDR-eq",
      qty: o.toNumber(),
      qtyFormula: `L${row}*M${row}*N${row}`,
      unitPrice: rIdr,
      currency: "IDR",
      wasteFactor: 1,
      subtotal: s.toNumber(),
      componentRef: code,
      notes: pMul !== 0 && row <= 57 ? `Workbook P col factor ${pMul}` : null,
    });
  }

  return items.map((it) => ({
    ...it,
    qty: finite(it.qty, 0),
    unitPrice: finite(it.unitPrice, 0),
    subtotal: finite(it.subtotal, 0),
  }));
}
