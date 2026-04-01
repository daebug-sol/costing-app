/**
 * AHU costing — high-precision parity layer vs Costing AHU DS50.xlsx.
 *
 * Blueprint: `excel-formulas-dump.json` (root). Each exported calculator documents
 * the sheet + cell(s) it mirrors. Use `Decimal` for money, mass, and dimensions;
 * apply `excelRound` / `excelRoundUp` only where the workbook does.
 */

import Decimal from "decimal.js";
import { d, excelRound, excelRoundUp, ifBlank } from "./excel-math";

// --- Types (inputs are `Decimal.Value` so callers pass strings or Decimal, not raw number math) ---

export type FramePanelDims = {
  /** mm — sheet "2. AHU-Frame & Panel" C2:D2 style */
  H: Decimal.Value;
  W: Decimal.Value;
  D: Decimal.Value;
};

/** SS304 drain pan + support (same kg model as `calculateDrainPan`). */
export type DrainPanCostParams = {
  H: Decimal.Value;
  W: Decimal.Value;
  D: Decimal.Value;
  pricePerKgSs304: Decimal.Value;
};

export type CoilRowIntermediate = {
  /** Sheet "CoilCost 20251027" — see J211: =IF(ISBLANK(J209),ROUND(I209/1000*H209*F209/10,0),J209) */
  I209: Decimal.Value;
  H209: Decimal.Value;
  F209: Decimal.Value;
  /** optional override (J209) when not blank */
  J209?: Decimal.Value | null;
};

// --- Small, exact helpers (examples from dump) ---

/**
 * Sheet `2. AHU-Frame & Panel` cell **I2** — `=I3*1000`
 * (I3 must be supplied in the same unit convention as Excel.)
 */
export function framePanelAirflowM3hFromI3(lpsOrBase: Decimal.Value): Decimal {
  return d(lpsOrBase).mul(1000);
}

/**
 * Sheet `2. AHU-Frame & Panel` cell **I3** — `=I4/3600` (I4 = CMH).
 */
export function framePanelI3FromI4(cmh: Decimal.Value): Decimal {
  return d(cmh).div(3600);
}

/**
 * Sheet `drainpan` — solid cylinder mass fragment: `=2*22/7*(12/2000)^2*1*8000`
 * (`12` = Ø mm → radius m = 12/2000)
 */
export function drainPanCylinderMassSample(params: {
  diameterMm: Decimal.Value;
  heightM: Decimal.Value;
  densityKgM3: Decimal.Value;
}): Decimal {
  const rM = d(params.diameterMm).div(2000);
  const pi = d("22").div(7);
  return d(2).mul(pi).mul(rM.pow(2)).mul(params.heightM).mul(params.densityKgM3);
}

/**
 * Sheet `CoilCost 20251027` cell **J211** —
 * `=IF(ISBLANK(J209),ROUND(I209/1000*H209*F209/10,0),J209)`
 */
export function calculateCoilRowJ211(input: CoilRowIntermediate): Decimal {
  const rounded = excelRound(
    d(input.I209).div(1000).mul(input.H209).mul(input.F209).div(10),
    0
  );
  return ifBlank(input.J209, rounded);
}

/**
 * Sheet `CoilCost 20251027` cell fragment — `=ROUNDUP((I209/25.4*G209)*G211,0)`
 * (pass already-resolved G209, G211 as `Decimal`.)
 */
export function coilCostRoundUpSample(i209: Decimal.Value, g209: Decimal.Value, g211: Decimal.Value): Decimal {
  return excelRoundUp(d(i209).div("25.4").mul(g209).mul(g211), 0);
}

// --- Block stubs: fill from excel-formulas-dump.json row-by-row ---

/**
 * Frame & panel block — weights / areas / costs.
 * Map rows from sheet `2. AHU-Frame & Panel` (e.g. row 18–19 area × price patterns).
 */
export function calculateFrameWeight(_input: FramePanelDims & { profileCode: string }): {
  totalKg: Decimal;
} {
  void _input;
  throw new Error(
    "calculateFrameWeight: implement from excel-formulas-dump.json → sheet \"2. AHU-Frame & Panel\""
  );
}

/**
 * Structure block — sheet `3. AHU-Structure`.
 */
export function calculateStructureWeight(_input: Record<string, Decimal.Value>): {
  totalKg: Decimal;
} {
  void _input;
  throw new Error(
    'calculateStructureWeight: implement from excel-formulas-dump.json → sheet "3. AHU-Structure"'
  );
}

/**
 * Total berat SS304 + biaya material (drain pan + support) — selaras `lib/calculations/drainPan.ts`.
 */
export function calculateDrainPanCost(input: DrainPanCostParams): {
  weightKg: Decimal;
  materialCost: Decimal;
} {
  void d(input.H);
  const W = d(input.W).div(1000);
  const D = d(input.D).div(1000);
  const kgPan = d("0.0015")
    .mul(W)
    .mul(D.add("0.15"))
    .mul(8800)
    .mul(1.15);
  const kgSup = d("0.0015")
    .mul("0.2")
    .mul(W)
    .mul(8800)
    .mul(1.15)
    .mul(2);
  const weightKg = kgPan.add(kgSup);
  const materialCost = weightKg.mul(input.pricePerKgSs304);
  return { weightKg, materialCost };
}

/**
 * Coil cost block — sheet `CoilCost 20251027`.
 */
export function calculateCoilCostBlock(_input: Record<string, Decimal.Value>): {
  lines: { ref: string; amount: Decimal }[];
} {
  void _input;
  throw new Error(
    'calculateCoilCostBlock: implement from excel-formulas-dump.json → sheet "CoilCost 20251027"'
  );
}
