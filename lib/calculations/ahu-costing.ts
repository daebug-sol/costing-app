/**
 * AHU costing — high-precision parity layer vs Costing AHU DS50.xlsx.
 *
 * Blueprint: `excel-formulas-dump.json` (root). Each exported calculator documents
 * the sheet + cell(s) it mirrors. Use `Decimal` for money, mass, and dimensions;
 * apply `excelRound` / `excelRoundUp` only where the workbook does.
 */

import Decimal from "decimal.js";
import { calculateCoil } from "./coil";
import { calculateDrainPan } from "./drainPan";
import type { MaterialPrice } from "./types";
import { d, excelRound, excelRoundUp, ifBlank } from "./excel-math";
import { structureShellNutMassKg } from "./structure-workbook";

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

export type StructureWeightInput = {
  H: Decimal.Value;
  W: Decimal.Value;
  D?: Decimal.Value;
};

export type CoilCostBlockInput = {
  FH: Decimal.Value;
  FL: Decimal.Value;
  rows: Decimal.Value;
  FPI: Decimal.Value;
  circuits: Decimal.Value;
  alFinPricePerKg: Decimal.Value;
  copperPricePerKg: Decimal.Value;
  giPricePerKg: Decimal.Value;
  coilFaceMm?: number;
  finPitchFactorG211?: number;
  finTubeOdMm?: number;
  tubeOdMm?: number;
  tubeWallMm?: number;
  tubeStretchMm?: number;
  tubePrimaryFactor?: number;
  headerAssemblyKg?: number;
  finPackSpanMm?: number;
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
  /**
   * Base parity-safe mass model:
   * panel skin mass only (GI 1.0mm + 5% liner waste) with
   * rectangular AHU casing area: 2*(HW + WD + HD).
   *
   * Profile/corner/clip pieces still come from module-level calculators.
   */
  void _input.profileCode;
  const Hm = d(_input.H).div(1000);
  const Wm = d(_input.W).div(1000);
  const Dm = d(_input.D).div(1000);
  const areaM2 = d(2).mul(Hm.mul(Wm).add(Wm.mul(Dm)).add(Hm.mul(Dm)));
  const density = d(8030);
  const thicknessM = d("0.001");
  const linerWaste = d("1.05");
  const totalKg = areaM2.mul(density).mul(thicknessM).mul(linerWaste);
  return { totalKg };
}

/**
 * Structure block — sheet `3. AHU-Structure`.
 */
export function calculateStructureWeight(_input: StructureWeightInput): {
  totalKg: Decimal;
} {
  const H = d(_input.H).toNumber();
  const W = d(_input.W).toNumber();
  const D = _input.D !== undefined ? d(_input.D).toNumber() : 0;
  return { totalKg: d(structureShellNutMassKg(H, W, D)) };
}

/**
 * Total berat SS304 + biaya material (drain pan + support) — selaras `lib/calculations/drainPan.ts`.
 */
export function calculateDrainPanCost(input: DrainPanCostParams): {
  weightKg: Decimal;
  materialCost: Decimal;
} {
  const mats = [
    {
      code: "SUS304-1.5",
      name: "SS304",
      category: "raw",
      density: 8800,
      pricePerKg: Number(input.pricePerKgSs304),
      currency: "IDR",
      unit: "kg",
    },
  ] as MaterialPrice[];
  const lines = calculateDrainPan({
    H: Number(input.H),
    W: Number(input.W),
    D: Number(input.D),
    materials: mats,
  });
  const weightKg = d(lines.reduce((s, it) => s + it.qty, 0));
  const materialCost = d(lines.reduce((s, it) => s + it.subtotal, 0));
  return { weightKg, materialCost };
}

/**
 * Coil cost block — sheet `CoilCost 20251027`.
 */
export function calculateCoilCostBlock(_input: CoilCostBlockInput): {
  lines: { ref: string; amount: Decimal }[];
} {
  const mats = [
    {
      code: "AL-FIN",
      name: "Aluminium fin",
      category: "raw",
      density: 2700,
      pricePerKg: Number(_input.alFinPricePerKg),
      currency: "IDR",
      unit: "kg",
    },
    {
      code: "COPPER-TUBE",
      name: "Copper tube",
      category: "raw",
      density: 8900,
      pricePerKg: Number(_input.copperPricePerKg),
      currency: "IDR",
      unit: "kg",
    },
    {
      code: "SGCC-1.0",
      name: "GI header",
      category: "raw",
      density: 8030,
      pricePerKg: Number(_input.giPricePerKg),
      currency: "IDR",
      unit: "kg",
    },
  ] as MaterialPrice[];

  const coilLines = calculateCoil({
    FH: Number(_input.FH),
    FL: Number(_input.FL),
    rows: Number(_input.rows),
    FPI: Number(_input.FPI),
    circuits: Number(_input.circuits),
    materials: mats,
    coilFaceMm: _input.coilFaceMm,
    finPitchFactorG211: _input.finPitchFactorG211,
    finTubeOdMm: _input.finTubeOdMm,
    tubeOdMm: _input.tubeOdMm,
    tubeWallMm: _input.tubeWallMm,
    tubeStretchMm: _input.tubeStretchMm,
    tubePrimaryFactor: _input.tubePrimaryFactor,
    headerAssemblyKg: _input.headerAssemblyKg,
    finPackSpanMm: _input.finPackSpanMm,
  });

  const finCost = d(coilLines[0]?.subtotal ?? 0);
  const tubeCost = d(coilLines[1]?.subtotal ?? 0);
  const headerCost = d(coilLines[2]?.subtotal ?? 0);

  return {
    lines: [
      { ref: "FIN", amount: finCost },
      { ref: "TUBE", amount: tubeCost },
      { ref: "HEADER", amount: headerCost },
      { ref: "TOTAL", amount: finCost.add(tubeCost).add(headerCost) },
    ],
  };
}
