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
  /**
   * Mirrors the same five GI rows used by `calculateStructure`:
   * - supply flange W/H
   * - fan partition
   * - filter rail H/W
   */
  void _input.D;
  const Hm = d(_input.H).div(1000);
  const Wm = d(_input.W).div(1000);
  const giDensity = d(8030);
  const t = d("0.0015");
  const widthStrip = d("0.1");
  const waste = d("1.15");

  const kgSupFlangeW = t.mul(widthStrip).mul(Wm).mul(giDensity).mul(waste).mul(2);
  const kgSupFlangeH = t.mul(widthStrip).mul(Hm).mul(giDensity).mul(waste).mul(2);
  const kgFanPart = t.mul(Hm).mul(Wm).mul(giDensity).mul(waste);
  const kgFilterH = t.mul(widthStrip).mul(Hm).mul(giDensity).mul(waste).mul(4);
  const kgFilterW = t.mul(widthStrip).mul(Wm).mul(giDensity).mul(waste).mul(4);

  return {
    totalKg: kgSupFlangeW
      .add(kgSupFlangeH)
      .add(kgFanPart)
      .add(kgFilterH)
      .add(kgFilterW),
  };
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
export function calculateCoilCostBlock(_input: CoilCostBlockInput): {
  lines: { ref: string; amount: Decimal }[];
} {
  const FH = d(_input.FH);
  const FL = d(_input.FL);
  const rows = d(_input.rows);
  const circuits = d(_input.circuits);
  const fpi = d(_input.FPI);
  const fpiSafe = fpi.lte(0) ? d(1) : fpi;

  const fhM = FH.div(1000);
  const flM = FL.div(1000);

  // Fin kg: same base equation as module calculator.
  const finKg = fhM
    .mul(flM)
    .mul(FL.div(fpiSafe.mul("25.4")))
    .mul("0.00011")
    .mul(2700)
    .mul("1.034");

  // Tube kg: pi*((OD^2-ID^2)/4)*rows*circuits*FHm*density*allowance
  const tubeCrossSection = d(Math.PI).mul(d("0.009525").pow(2).minus(d("0.008525").pow(2))).div(4);
  const tubeKg = tubeCrossSection.mul(rows).mul(circuits).mul(fhM).mul(8900).mul("1.02");

  // Header kg (GI row)
  const headerKg = d("0.0015")
    .mul("0.268")
    .mul(fhM.add("0.1"))
    .mul(8030)
    .mul("1.15")
    .mul(2);

  const finCost = finKg.mul(_input.alFinPricePerKg);
  const tubeCost = tubeKg.mul(_input.copperPricePerKg);
  const headerCost = headerKg.mul(_input.giPricePerKg);

  return {
    lines: [
      { ref: "FIN", amount: finCost },
      { ref: "TUBE", amount: tubeCost },
      { ref: "HEADER", amount: headerCost },
      { ref: "TOTAL", amount: finCost.add(tubeCost).add(headerCost) },
    ],
  };
}
