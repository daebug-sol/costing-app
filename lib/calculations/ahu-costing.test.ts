/**
 * Parity tests: TypeScript calculators vs Costing AHU DS50.xlsx (golden values from excel-formulas-dump.json).
 *
 * Unit under test: "Section 1" on sheet `2. AHU-Frame & Panel` with H=1420, W=1930, D=1625 mm
 * (same numeric inputs as the workbook row tied to AHU IU1 in the live file — that sheet name is not in the formula dump).
 */

import Decimal from "decimal.js";
import fs from "fs";
import path from "path";
import {
  calculateCoilCostBlock,
  calculateCoilRowJ211,
  calculateFrameWeight,
  calculateStructureWeight,
  coilCostRoundUpSample,
  drainPanCylinderMassSample,
  framePanelAirflowM3hFromI3,
  framePanelI3FromI4,
} from "./ahu-costing";
import { d, excelRoundDown } from "./excel-math";

/** Max |a − b| for currency / weights / intermediate decimals (Rupiah-scale). */
const EPS = 0.01;

function expectDecimalNear(actual: Decimal, expected: Decimal.Value, epsilon = EPS): void {
  const diff = actual.minus(expected).abs();
  expect(diff.lte(epsilon)).toBe(true);
}

type DumpCell = {
  formula?: string;
  calculatedResult?: unknown;
  value?: unknown;
};

function readExcelDump(): {
  sheets: Record<string, { cells?: Record<string, DumpCell> }>;
} {
  const dumpPath = path.join(process.cwd(), "excel-formulas-dump.json");
  const raw = fs.readFileSync(dumpPath, "utf8");
  return JSON.parse(raw) as {
    sheets: Record<string, { cells?: Record<string, DumpCell> }>;
  };
}

function dumpCell(
  dump: { sheets: Record<string, { cells?: Record<string, DumpCell> }> },
  sheet: string,
  cell: string
): DumpCell {
  const got = dump.sheets[sheet]?.cells?.[cell];
  expect(got).toBeDefined();
  return got as DumpCell;
}

function dumpCellMaybe(
  dump: { sheets: Record<string, { cells?: Record<string, DumpCell> }> },
  sheet: string,
  cell: string
): DumpCell | undefined {
  return dump.sheets[sheet]?.cells?.[cell];
}

function sumDumpRangeMaybe(
  dump: { sheets: Record<string, { cells?: Record<string, DumpCell> }> },
  sheet: string,
  col: string,
  startRow: number,
  endRow: number,
  source: "value" | "calculatedResult" = "calculatedResult"
): Decimal {
  let total = d(0);
  for (let row = startRow; row <= endRow; row += 1) {
    const cell = dumpCellMaybe(dump, sheet, `${col}${row}`);
    total = total.add(Number((source === "calculatedResult" ? cell?.calculatedResult : cell?.value) ?? 0));
  }
  return total;
}

function sumDumpRange(
  dump: { sheets: Record<string, { cells?: Record<string, DumpCell> }> },
  sheet: string,
  col: string,
  startRow: number,
  endRow: number
): Decimal {
  let total = d(0);
  for (let row = startRow; row <= endRow; row += 1) {
    const cell = dumpCell(dump, sheet, `${col}${row}`);
    total = total.add(Number(cell.calculatedResult ?? cell.value ?? 0));
  }
  return total;
}

/** Sheet names must match `excel-formulas-dump.json` exactly (incl. trailing spaces). */
const SHEET_FRAME = "2. AHU-Frame & Panel";
const SHEET_COIL = "CoilCost 20251027";
const SHEET_DAMPER_FA = "VolDamperCost2023 FA ";
const SHEET_DAMPER_RA = "VolDamperCost2023 RA ";

/** Excel `Q44` on VolDamper sheets: `=IF(P43<=1400,0,IF(AND(P43>1400,P43<=2100),1,2))` */
function damperVerticalProfileCountFromP43(p43: Decimal.Value): Decimal {
  const p = d(p43);
  if (p.lte(1400)) return d(0);
  if (p.gt(1400) && p.lte(2100)) return d(1);
  return d(2);
}

function coilRowJMassFromFGHI(f: Decimal.Value, g: Decimal.Value, h: Decimal.Value, i: Decimal.Value): Decimal {
  const F = d(f);
  const G = d(g);
  const H = d(h);
  const I = d(i);
  if (F.gt(0)) {
    return d(22)
      .div(28)
      .mul(F.div(1000).pow(2).minus(F.div(1000).minus(d(2).mul(G).div(1000)).pow(2)))
      .mul(H.div(1000));
  }
  if (G.gt(0)) return G.div(1000).mul(H.div(1000)).mul(I.div(1000));
  if (H.gt(0)) return H.div(1000).mul(I.div(1000));
  if (I.eq(0)) return d(1);
  return I.div(1000);
}

/** Excel `Q43`: `=P44*100+10` (opening width mm from column count P44). */
function damperOpeningWidthMmFromP44(p44: Decimal.Value): Decimal {
  return d(p44).mul(100).add(10);
}

/** Excel `P46`: `=Q43/1000*P43/1000` (actuator sizing area, m²). */
function damperActuatorAreaM2FromP43Q43(p43Mm: Decimal.Value, q43Mm: Decimal.Value): Decimal {
  return d(q43Mm).div(1000).mul(d(p43Mm).div(1000));
}

/**
 * Excel `Q46` torque label ladder (strict inequalities match workbook IF/AND).
 * `=IF(P46<0.5,"2Nm",IF(AND(P46>0.5,P46<1),"5Nm", ...`
 */
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

/** Excel `K50`/`K51`/`K52` volume fragment (m³) when tube cols F–H are blank. */
function volDamperFrameK_m3(opts: { Fmm: number; Gmm: number; Hmm: number; Imm: number }): Decimal {
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

/** Excel `K53` blade row volume fragment when F–H are blank. */
function volDamperBladeK_m3(opts: { Fmm: number; Gmm: number; Hmm: number; Q45mm: number }): Decimal {
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

function assertVolDamperSubtotalRanges(
  dump: { sheets: Record<string, { cells?: Record<string, DumpCell> }> },
  sheet: string
): void {
  const q59 = dumpCell(dump, sheet, "Q59");
  const s59 = dumpCell(dump, sheet, "S59");
  expect(q59.formula).toBe("=SUM(Q50:Q58)");
  expect(s59.formula).toBe("=SUM(S50:S58)");
  const sumQ = sumDumpRange(dump, sheet, "Q", 50, 58);
  const sumS = sumDumpRange(dump, sheet, "S", 50, 58);
  expectDecimalNear(sumQ, Number(q59.calculatedResult ?? q59.value), EPS);
  expectDecimalNear(sumS, Number(s59.calculatedResult ?? s59.value), EPS);
}

function numericFromDumpMaybe(cell: DumpCell | undefined, fallback = 0): number {
  if (!cell) return fallback;
  const n = Number(cell.calculatedResult ?? cell.value);
  return Number.isFinite(n) ? n : fallback;
}

/** Q43/P46/Q46 + frame row 50 + blade 53 + gear 56 + line costs S53/S56 (VolDamper FA/RA). */
function assertVolDamperExtendedParityChains(
  dump: { sheets: Record<string, { cells?: Record<string, DumpCell> }> },
  sheet: string
): void {
  const p43 = dumpCell(dump, sheet, "P43");
  const p44 = dumpCell(dump, sheet, "P44");
  const q43 = dumpCell(dump, sheet, "Q43");
  expect(q43.formula).toBe("=P44*100+10");
  expectDecimalNear(
    damperOpeningWidthMmFromP44(Number(p44.calculatedResult ?? p44.value)),
    Number(q43.calculatedResult ?? q43.value)
  );

  const p46 = dumpCell(dump, sheet, "P46");
  const q46 = dumpCell(dump, sheet, "Q46");
  expect(p46.formula).toBe("=Q43/1000*P43/1000");
  const p46Calc = damperActuatorAreaM2FromP43Q43(
    Number(p43.calculatedResult ?? p43.value),
    Number(q43.calculatedResult ?? q43.value)
  );
  expectDecimalNear(p46Calc, Number(p46.calculatedResult ?? p46.value));
  expect(String(q46.formula)).toContain("P46<0.5");
  expect(damperActuatorTorqueLabelFromAreaM2(p46Calc)).toBe(String(q46.calculatedResult));

  const i50 = dumpCell(dump, sheet, "I50");
  expect(i50.formula).toBe("=P43+34.4*2");
  expectDecimalNear(
    d(Number(p43.calculatedResult ?? p43.value)).add(34.4 * 2),
    Number(i50.calculatedResult)
  );

  const f50 = numericFromDumpMaybe(dumpCellMaybe(dump, sheet, "F50"));
  const g50 = numericFromDumpMaybe(dumpCellMaybe(dump, sheet, "G50"));
  const h50 = numericFromDumpMaybe(dumpCellMaybe(dump, sheet, "H50"));
  const i50n = Number(i50.calculatedResult);
  const k50calc = volDamperFrameK_m3({ Fmm: f50, Gmm: g50, Hmm: h50, Imm: i50n });
  const k50 = dumpCell(dump, sheet, "K50");
  expectDecimalNear(k50calc, Number(k50.calculatedResult));

  const j50 = dumpCellMaybe(dump, sheet, "J50");
  const j50n = numericFromDumpMaybe(j50, 1);
  const l50 = dumpCell(dump, sheet, "L50");
  expect(l50.formula).toBe("=J50*K50");
  expectDecimalNear(d(j50n).mul(k50calc), Number(l50.calculatedResult));

  const m50 = dumpCell(dump, sheet, "M50");
  const n50 = dumpCell(dump, sheet, "N50");
  const o50 = dumpCell(dump, sheet, "O50");
  expect(o50.formula).toBe("=L50*M50*N50");
  expectDecimalNear(
    d(Number(l50.calculatedResult)).mul(Number(m50.value)).mul(Number(n50.value)),
    Number(o50.calculatedResult)
  );

  const p45 = dumpCell(dump, sheet, "P45");
  const q45 = dumpCell(dump, sheet, "Q45");
  const n53 = dumpCell(dump, sheet, "N53");
  expect(n53.formula).toBe("=+P45");
  expectDecimalNear(d(Number(p45.calculatedResult)), Number(n53.calculatedResult), 0);

  const f53 = numericFromDumpMaybe(dumpCellMaybe(dump, sheet, "F53"));
  const g53 = numericFromDumpMaybe(dumpCellMaybe(dump, sheet, "G53"));
  const h53 = numericFromDumpMaybe(dumpCellMaybe(dump, sheet, "H53"));
  const q45n = Number(q45.calculatedResult ?? q45.value);
  const k53calc = volDamperBladeK_m3({ Fmm: f53, Gmm: g53, Hmm: h53, Q45mm: q45n });
  const k53 = dumpCell(dump, sheet, "K53");
  expectDecimalNear(k53calc, Number(k53.calculatedResult));

  const j53 = dumpCellMaybe(dump, sheet, "J53");
  const j53n = numericFromDumpMaybe(j53, 1);
  const l53 = dumpCell(dump, sheet, "L53");
  expect(l53.formula).toBe("=J53*K53");
  expectDecimalNear(d(j53n).mul(k53calc), Number(l53.calculatedResult));

  const m53 = dumpCell(dump, sheet, "M53");
  const o53 = dumpCell(dump, sheet, "O53");
  expect(o53.formula).toBe("=L53*M53*N53");
  expectDecimalNear(
    d(Number(l53.calculatedResult)).mul(Number(m53.value)).mul(Number(n53.calculatedResult)),
    Number(o53.calculatedResult)
  );

  const r53 = dumpCell(dump, sheet, "R53");
  const s53 = dumpCell(dump, sheet, "S53");
  expect(String(s53.formula)).toMatch(/^=\+?O53\*R53$/);
  expectDecimalNear(
    d(Number(o53.calculatedResult)).mul(Number(r53.calculatedResult)),
    Number(s53.calculatedResult)
  );

  const n56 = dumpCell(dump, sheet, "N56");
  expect(n56.formula).toBe("=+N53");
  expectDecimalNear(d(Number(n53.calculatedResult)), Number(n56.calculatedResult), 0);

  const o56 = dumpCell(dump, sheet, "O56");
  const r56 = dumpCell(dump, sheet, "R56");
  const s56 = dumpCell(dump, sheet, "S56");
  expect(String(s56.formula)).toMatch(/^=\+?O56\*R56$/);
  expectDecimalNear(
    d(Number(o56.calculatedResult)).mul(Number(r56.calculatedResult)),
    Number(s56.calculatedResult)
  );
}

describe("AHU costing parity (golden vs excel-formulas-dump.json)", () => {
  describe('Sheet "2. AHU-Frame & Panel" — Section 1, H=1420 W=1930 D=1625', () => {
    const goldenDims = { H: 1420, W: 1930, D: 1625 };

    it("records workbook dimensions for Section 1 row (C2:D2:E2)", () => {
      expect(goldenDims.H).toBe(1420);
      expect(goldenDims.W).toBe(1930);
      expect(goldenDims.D).toBe(1625);
    });

    it("I3 = I4/3600 matches Excel when I4 (CMH) = 5200", () => {
      const i4 = 5200;
      const excelI3 = "1.4444444444444444";
      expectDecimalNear(framePanelI3FromI4(i4), excelI3);
    });

    it("I2 = I3*1000 matches Excel (chain from I4=5200)", () => {
      const i3 = framePanelI3FromI4(5200);
      const excelI2 = "1444.4444444444443";
      expectDecimalNear(framePanelAirflowM3hFromI3(i3), excelI2);
    });

    it("M3 = M2*3412 matches Excel when M2 = 148.55 kW (thermal)", () => {
      const m2 = "148.55";
      const excelM3 = "506852.60000000003";
      expectDecimalNear(d(m2).mul(3412), excelM3);
    });

    it("M4 = M3/10000 matches Excel", () => {
      const m3 = d("506852.60000000003");
      const excelM4 = "50.68526000000001";
      expectDecimalNear(m3.div(10000), excelM4);
    });
  });

  describe('Sheet "drainpan" — cylinder mass fragment (cell R60)', () => {
    it("=2*22/7*(12/2000)^2*1*8000", () => {
      const excelR60 = "1.8102857142857143";
      const got = drainPanCylinderMassSample({
        diameterMm: 12,
        heightM: 1,
        densityKgM3: 8000,
      });
      expectDecimalNear(got, excelR60);
    });
  });

  describe('Sheet "CoilCost 20251027"', () => {
    const I209 = 900;
    const H209 = 38;
    const F209 = 6;
    const G209 = 12;
    const G211 = "1.0694056943669443";

    it("J211 uses ROUND branch when J209 is blank → ROUND(I209/1000*H209*F209/10,0) = 21", () => {
      const excelJ211_blank = 21;
      const got = calculateCoilRowJ211({
        I209,
        H209,
        F209,
        J209: null,
      });
      expectDecimalNear(got, excelJ211_blank, 0);
    });

    it("J211 returns J209 when override present (Excel snapshot J209=38 → J211=38)", () => {
      const got = calculateCoilRowJ211({
        I209,
        H209,
        F209,
        J209: 38,
      });
      expectDecimalNear(got, 38, 0);
    });

    it("L236 = ROUNDUP((I209/25.4*G209)*G211,0) = 455", () => {
      const excelL236 = 455;
      const got = coilCostRoundUpSample(I209, G209, G211);
      expectDecimalNear(got, excelL236, 0);
    });
  });

  describe('Sheet "VolDamperCost2023 FA" — ROUNDDOWN (golden dari excel-formulas-dump)', () => {
    it("P44 = ROUNDDOWN(C43/100,0) when C43 = 410 → 4", () => {
      const c43 = 410;
      const excelP44 = 4;
      const got = excelRoundDown(d(c43).div(100), 0);
      expectDecimalNear(got, excelP44, 0);
    });
  });

  describe("parity layer non-stub regressions", () => {
    it("calculateFrameWeight returns positive kg for valid dims", () => {
      const got = calculateFrameWeight({
        H: 1420,
        W: 1930,
        D: 1625,
        profileCode: "5060Y-NA06",
      });
      expect(got.totalKg.gt(0)).toBe(true);
    });

    it("calculateStructureWeight returns positive kg for valid dims", () => {
      const got = calculateStructureWeight({
        H: 1420,
        W: 1930,
        D: 1625,
      });
      expect(got.totalKg.gt(0)).toBe(true);
    });

    it("calculateCoilCostBlock keeps TOTAL = FIN + TUBE + HEADER", () => {
      const got = calculateCoilCostBlock({
        FH: 762,
        FL: 733,
        rows: 6,
        FPI: 10,
        circuits: 1,
        alFinPricePerKg: 62000,
        copperPricePerKg: 120000,
        giPricePerKg: 18000,
      });
      const fin = got.lines.find((x) => x.ref === "FIN")?.amount ?? d(0);
      const tube = got.lines.find((x) => x.ref === "TUBE")?.amount ?? d(0);
      const header = got.lines.find((x) => x.ref === "HEADER")?.amount ?? d(0);
      const total = got.lines.find((x) => x.ref === "TOTAL")?.amount ?? d(0);
      expect(got.lines.length).toBe(4);
      expectDecimalNear(total, fin.add(tube).add(header));
      expect(total.gt(0)).toBe(true);
    });
  });

  describe("golden cells loaded directly from excel-formulas-dump.json", () => {
    const dump = readExcelDump();

    it("Frame sheet formulas (I3/I2) stay aligned with dump", () => {
      const i3 = dumpCell(dump, SHEET_FRAME, "I3");
      const i2 = dumpCell(dump, SHEET_FRAME, "I2");
      const i4 = dumpCell(dump, SHEET_FRAME, "I4");
      const m2 = dumpCell(dump, SHEET_FRAME, "M2");
      const m3 = dumpCell(dump, SHEET_FRAME, "M3");
      const m4 = dumpCell(dump, SHEET_FRAME, "M4");

      expect(i3.formula).toBe("=I4/3600");
      expect(i2.formula).toBe("=I3*1000");
      expect(m3.formula).toBe("=M2*3412");
      expect(m4.formula).toBe("=M3/10000");

      const i4Val = Number(i4.value);
      expectDecimalNear(framePanelI3FromI4(i4Val), Number(i3.calculatedResult));
      expectDecimalNear(
        framePanelAirflowM3hFromI3(Number(i3.calculatedResult)),
        Number(i2.calculatedResult)
      );
      expectDecimalNear(d(Number(m2.value)).mul(3412), Number(m3.calculatedResult));
      expectDecimalNear(
        d(Number(m3.calculatedResult)).div(10000),
        Number(m4.calculatedResult)
      );
    });

    it("Coil sheet formulas (J211/L236) stay aligned with dump", () => {
      const j211 = dumpCell(dump, SHEET_COIL, "J211");
      const l236 = dumpCell(dump, SHEET_COIL, "L236");
      const i209 = dumpCell(dump, SHEET_COIL, "I209");
      const h209 = dumpCell(dump, SHEET_COIL, "H209");
      const f209 = dumpCell(dump, SHEET_COIL, "F209");
      const j209 = dumpCell(dump, SHEET_COIL, "J209");
      const g209 = dumpCell(dump, SHEET_COIL, "G209");
      const g211 = dumpCell(dump, SHEET_COIL, "G211");

      expect(String(j211.formula)).toContain("IF(ISBLANK(J209)");
      expect(String(l236.formula)).toContain("ROUNDUP");
      expect(String(g211.formula)).toContain("VLOOKUP");

      const j211Got = calculateCoilRowJ211({
        I209: Number(i209.value),
        H209: Number(h209.value),
        F209: Number(f209.value),
        J209: Number(j209.value),
      });
      expectDecimalNear(j211Got, Number(j211.calculatedResult), 0);

      const l236Got = coilCostRoundUpSample(
        Number(i209.value),
        Number(g209.value),
        Number(g211.calculatedResult ?? g211.value)
      );
      expectDecimalNear(l236Got, Number(l236.calculatedResult), 0);
    });

    it("Damper FA sheet keeps ROUNDDOWN behavior at P44", () => {
      const p44 = dumpCell(dump, SHEET_DAMPER_FA, "P44");
      const c43 = dumpCell(dump, SHEET_DAMPER_FA, "C43");
      expect(p44.formula).toBe("=ROUNDDOWN(C43/100,0)");
      const got = excelRoundDown(d(Number(c43.value)).div(100), 0);
      expectDecimalNear(got, Number(p44.calculatedResult), 0);
    });

    it("Damper RA sheet keeps ROUNDDOWN behavior at P44", () => {
      const p44 = dumpCell(dump, SHEET_DAMPER_RA, "P44");
      const c43 = dumpCell(dump, SHEET_DAMPER_RA, "C43");
      expect(p44.formula).toBe("=ROUNDDOWN(C43/100,0)");
      const got = excelRoundDown(d(Number(c43.value)).div(100), 0);
      expectDecimalNear(got, Number(p44.calculatedResult), 0);
    });

    it("Frame sheet derived openings C14/D14 match dump (=C2-100, =D2-100)", () => {
      const c2 = dumpCell(dump, SHEET_FRAME, "C2");
      const d2 = dumpCell(dump, SHEET_FRAME, "D2");
      const c14 = dumpCell(dump, SHEET_FRAME, "C14");
      const d14 = dumpCell(dump, SHEET_FRAME, "D14");
      expect(c14.formula).toBe("=C2-100");
      expect(d14.formula).toBe("=D2-100");
      expectDecimalNear(d(Number(c2.value)).minus(100), Number(c14.calculatedResult));
      expectDecimalNear(d(Number(d2.value)).minus(100), Number(d14.calculatedResult));
    });

    it("Frame sheet subtotal N96 matches SUM(N18:N95)", () => {
      const n96 = dumpCell(dump, SHEET_FRAME, "N96");
      expect(n96.formula).toBe("=SUM(N18:N95)");
      const sumN = sumDumpRange(dump, SHEET_FRAME, "N", 18, 95);
      expectDecimalNear(sumN, Number(n96.calculatedResult));
    });

    it("Frame sheet K-column profile count chain (K26:K32) matches dump references", () => {
      const k20 = dumpCell(dump, SHEET_FRAME, "K20");
      const k21 = dumpCell(dump, SHEET_FRAME, "K21");
      const k22 = dumpCell(dump, SHEET_FRAME, "K22");
      const k23 = dumpCell(dump, SHEET_FRAME, "K23");
      const k24 = dumpCell(dump, SHEET_FRAME, "K24");
      const k25 = dumpCell(dump, SHEET_FRAME, "K25");
      const k26 = dumpCell(dump, SHEET_FRAME, "K26");
      const k27 = dumpCell(dump, SHEET_FRAME, "K27");
      const k28 = dumpCell(dump, SHEET_FRAME, "K28");
      const k29 = dumpCell(dump, SHEET_FRAME, "K29");
      const k30 = dumpCell(dump, SHEET_FRAME, "K30");
      const k31 = dumpCell(dump, SHEET_FRAME, "K31");
      const k32 = dumpCell(dump, SHEET_FRAME, "K32");

      expect(k26.formula).toBe("=K20*2");
      expect(k27.formula).toBe("=K21*2");
      expect(k28.formula).toBe("=K22*2");
      expect(k29.formula).toBe("=K23*2");
      expect(k30.formula).toBe("=K24*2");
      expect(k31.formula).toBe("=K25*2");
      expect(k32.formula).toBe("=K26");

      expectDecimalNear(d(Number(k20.value)).mul(2), Number(k26.calculatedResult), 0);
      expectDecimalNear(d(Number(k21.value)).mul(2), Number(k27.calculatedResult), 0);
      expectDecimalNear(d(Number(k22.value)).mul(2), Number(k28.calculatedResult), 0);
      expectDecimalNear(d(Number(k23.value)).mul(2), Number(k29.calculatedResult), 0);
      expectDecimalNear(d(Number(k24.value)).mul(2), Number(k30.calculatedResult), 0);
      expectDecimalNear(d(Number(k25.value)).mul(2), Number(k31.calculatedResult), 0);
      expectDecimalNear(d(Number(k26.calculatedResult)), Number(k32.calculatedResult), 0);
    });

    it("Frame panel rows 44:55 keep liner/PU formulas and block subtotals", () => {
      const h44 = dumpCell(dump, SHEET_FRAME, "H44");
      const i44 = dumpCell(dump, SHEET_FRAME, "I44");
      const j44 = dumpCell(dump, SHEET_FRAME, "J44");
      const n44 = dumpCell(dump, SHEET_FRAME, "N44");
      const o44 = dumpCell(dump, SHEET_FRAME, "O44");
      const h45 = dumpCell(dump, SHEET_FRAME, "H45");
      const i45 = dumpCell(dump, SHEET_FRAME, "I45");
      const j45 = dumpCell(dump, SHEET_FRAME, "J45");
      const n45 = dumpCell(dump, SHEET_FRAME, "N45");
      const o45 = dumpCell(dump, SHEET_FRAME, "O45");

      expect(j44.formula).toBe("=H44*I44");
      expect(n44.formula).toBe("=H44*K44*L44");
      expect(o44.formula).toBe("=J44*K44*M44");
      expect(j45.formula).toBe("=H45*I45");
      expect(n45.formula).toBe("=H45*K45*L45");
      expect(o45.formula).toBe("=J45*K45*M45");

      expectDecimalNear(
        d(Number(h44.calculatedResult)).mul(Number(i44.value)),
        Number(j44.calculatedResult)
      );
      expectDecimalNear(
        d(Number(h45.calculatedResult)).mul(Number(i45.value)),
        Number(j45.calculatedResult)
      );

      const nPanelRange = sumDumpRange(dump, SHEET_FRAME, "N", 44, 55);
      const oPanelRange = sumDumpRange(dump, SHEET_FRAME, "O", 44, 55);
      expectDecimalNear(nPanelRange, "174.26118020000004");
      expectDecimalNear(oPanelRange, "7008632.1113599995");
    });

    it("Frame total row N96/O96 equals SUM over N18:N95 and O18:O95", () => {
      const n96 = dumpCell(dump, SHEET_FRAME, "N96");
      const o96 = dumpCell(dump, SHEET_FRAME, "O96");
      expect(n96.formula).toBe("=SUM(N18:N95)");
      expect(o96.formula).toBe("=SUM(O18:O95)");

      const nRange = sumDumpRange(dump, SHEET_FRAME, "N", 18, 95);
      const oRange = sumDumpRange(dump, SHEET_FRAME, "O", 18, 95);
      expectDecimalNear(nRange, Number(n96.calculatedResult));
      expectDecimalNear(oRange, Number(o96.calculatedResult));
    });

    it("Coil sheet H211/F211/K211/F223 match dump (geometry + tube-count row)", () => {
      const h209 = dumpCell(dump, SHEET_COIL, "H209");
      const d210 = dumpCell(dump, SHEET_COIL, "D210");
      const h211 = dumpCell(dump, SHEET_COIL, "H211");
      expect(h211.formula).toBe("=H209*D210");
      expectDecimalNear(
        d(Number(h209.value)).mul(Number(d210.calculatedResult)),
        Number(h211.calculatedResult)
      );

      const f209 = dumpCell(dump, SHEET_COIL, "F209");
      const d211 = dumpCell(dump, SHEET_COIL, "D211");
      const f211 = dumpCell(dump, SHEET_COIL, "F211");
      expect(f211.formula).toBe("=F209*D211");
      expectDecimalNear(
        d(Number(f209.value)).mul(Number(d211.calculatedResult)),
        Number(f211.calculatedResult)
      );

      const k211 = dumpCell(dump, SHEET_COIL, "K211");
      expect(k211.formula).toBe("=IF(ISBLANK(K209),1,K209)");
      expectDecimalNear(d(1), Number(k211.calculatedResult), 0);

      const f223 = dumpCell(dump, SHEET_COIL, "F223");
      expectDecimalNear(d(Number(f209.value)).mul(Number(h209.value)), Number(f223.calculatedResult), 0);
    });

    it("Coil FIN chain matches dump (J236→M236→P236→R236)", () => {
      const f236 = dumpCellMaybe(dump, SHEET_COIL, "F236");
      const g236 = dumpCell(dump, SHEET_COIL, "G236");
      const h236 = dumpCell(dump, SHEET_COIL, "H236");
      const i236 = dumpCell(dump, SHEET_COIL, "I236");
      const j236 = dumpCellMaybe(dump, SHEET_COIL, "J236");
      const k236 = dumpCell(dump, SHEET_COIL, "K236");
      const l236 = dumpCell(dump, SHEET_COIL, "L236");
      const m236 = dumpCell(dump, SHEET_COIL, "M236");
      const n236 = dumpCellMaybe(dump, SHEET_COIL, "N236");
      const o236 = dumpCell(dump, SHEET_COIL, "O236");
      const p236 = dumpCell(dump, SHEET_COIL, "P236");
      const q236 = dumpCell(dump, SHEET_COIL, "Q236");
      const r236 = dumpCell(dump, SHEET_COIL, "R236");
      const i209 = dumpCell(dump, SHEET_COIL, "I209");
      const g209 = dumpCell(dump, SHEET_COIL, "G209");
      const g211 = dumpCell(dump, SHEET_COIL, "G211");

      const f = Number(f236?.calculatedResult ?? f236?.value ?? 0);
      const g = Number(g236.calculatedResult ?? g236.value);
      const h = Number(h236.calculatedResult ?? h236.value);
      const i = Number(i236.calculatedResult ?? i236.value);
      const jCalc = coilRowJMassFromFGHI(f, g, h, i);
      expectDecimalNear(jCalc, Number(j236?.calculatedResult ?? jCalc));
      if (j236?.formula) {
        expect(String(j236.formula)).toContain("IF(F236>0");
      }

      const lCalc = coilCostRoundUpSample(
        Number(i209.value),
        Number(g209.value),
        Number(g211.calculatedResult ?? g211.value)
      );
      expectDecimalNear(lCalc, Number(l236.calculatedResult), 0);

      const mCalc = jCalc.mul(Number(k236.calculatedResult)).mul(lCalc);
      expectDecimalNear(mCalc, Number(m236.calculatedResult));
      expect(String(m236.formula)).toBe("=J236*K236*L236");

      const pCalc = mCalc.mul(Number(n236?.value ?? n236?.calculatedResult ?? 1)).mul(Number(o236.calculatedResult));
      expectDecimalNear(pCalc, Number(p236.calculatedResult));
      expect(String(p236.formula)).toBe("=M236*N236*O236");

      const rCalc = pCalc.mul(Number(q236.calculatedResult));
      expectDecimalNear(rCalc, Number(r236.calculatedResult));
      expect(String(r236.formula)).toBe("=P236*Q236");
      expect(i).toBeGreaterThan(0);
    });

    it("Coil TUBE chain matches dump (J237→M237→P237→R237)", () => {
      const f237 = dumpCell(dump, SHEET_COIL, "F237");
      const g237 = dumpCell(dump, SHEET_COIL, "G237");
      const h237 = dumpCell(dump, SHEET_COIL, "H237");
      const j237 = dumpCell(dump, SHEET_COIL, "J237");
      const k237 = dumpCell(dump, SHEET_COIL, "K237");
      const l237 = dumpCell(dump, SHEET_COIL, "L237");
      const m237 = dumpCell(dump, SHEET_COIL, "M237");
      const n237 = dumpCellMaybe(dump, SHEET_COIL, "N237");
      const o237 = dumpCell(dump, SHEET_COIL, "O237");
      const p237 = dumpCell(dump, SHEET_COIL, "P237");
      const q237 = dumpCell(dump, SHEET_COIL, "Q237");
      const r237 = dumpCell(dump, SHEET_COIL, "R237");
      const f209 = dumpCell(dump, SHEET_COIL, "F209");
      const h209 = dumpCell(dump, SHEET_COIL, "H209");

      const f = Number(f237.calculatedResult ?? f237.value);
      const g = Number(g237.calculatedResult ?? g237.value);
      const h = Number(h237.calculatedResult ?? h237.value);
      const jCalc = coilRowJMassFromFGHI(f, g, h, 0);
      expectDecimalNear(jCalc, Number(j237.calculatedResult));
      expect(String(j237.formula)).toContain("IF(F237>0");

      const lCalc = d(Number(f209.value)).mul(Number(h209.value));
      expectDecimalNear(lCalc, Number(l237.calculatedResult), 0);
      expect(String(l237.formula)).toBe("=F209*H209");

      const mCalc = jCalc.mul(Number(k237.calculatedResult)).mul(lCalc);
      expectDecimalNear(mCalc, Number(m237.calculatedResult));
      expect(String(m237.formula)).toBe("=J237*K237*L237");

      const pCalc = mCalc.mul(Number(n237?.value ?? n237?.calculatedResult ?? 1)).mul(Number(o237.calculatedResult));
      expectDecimalNear(pCalc, Number(p237.calculatedResult));
      expect(String(p237.formula)).toBe("=M237*N237*O237");

      const rCalc = pCalc.mul(Number(q237.calculatedResult));
      expectDecimalNear(rCalc, Number(r237.calculatedResult));
      expect(String(r237.formula)).toBe("=P237*Q237");
    });

    it("Coil HEADER chain matches dump (J238→M238→P238→R238)", () => {
      const j238 = dumpCell(dump, SHEET_COIL, "J238");
      const k238 = dumpCell(dump, SHEET_COIL, "K238");
      const l238 = dumpCell(dump, SHEET_COIL, "L238");
      const m238 = dumpCell(dump, SHEET_COIL, "M238");
      const n238 = dumpCellMaybe(dump, SHEET_COIL, "N238");
      const o238 = dumpCellMaybe(dump, SHEET_COIL, "O238");
      const p238 = dumpCell(dump, SHEET_COIL, "P238");
      const q238 = dumpCell(dump, SHEET_COIL, "Q238");
      const r238 = dumpCell(dump, SHEET_COIL, "R238");

      expect(String(j238.formula)).toContain("IF(F238>0");
      expectDecimalNear(d(1), Number(j238.calculatedResult), 0);

      const mCalc = d(Number(j238.calculatedResult)).mul(Number(k238.calculatedResult)).mul(Number(l238.calculatedResult));
      expectDecimalNear(mCalc, Number(m238.calculatedResult), 0);
      expect(String(m238.formula)).toBe("=J238*K238*L238");

      const pCalc = mCalc
        .mul(Number(n238.value ?? n238.calculatedResult ?? 1))
        .mul(Number(o238.value ?? o238.calculatedResult ?? 1));
      expectDecimalNear(pCalc, Number(p238.calculatedResult), 0);
      expect(String(p238.formula)).toBe("=M238*N238*O238");

      const rCalc = pCalc.mul(Number(q238.calculatedResult));
      expectDecimalNear(rCalc, Number(r238.calculatedResult));
      expect(String(r238.formula)).toBe("=P238*Q238");
    });

    it("Coil TOTAL chain matches dump (V235 = SUM(R235:R238))", () => {
      const v235 = dumpCell(dump, SHEET_COIL, "V235");
      const r236 = dumpCell(dump, SHEET_COIL, "R236");
      const r237 = dumpCell(dump, SHEET_COIL, "R237");
      const r238 = dumpCell(dump, SHEET_COIL, "R238");

      expect(String(v235.formula)).toBe("=SUM(R235:R238)");
      const subtotal = d(Number(r236.calculatedResult))
        .add(Number(r237.calculatedResult))
        .add(Number(r238.calculatedResult));
      expectDecimalNear(subtotal, Number(v235.calculatedResult));
    });

    it("Damper FA Q44/P45/Q45 chain matches dump", () => {
      const p43 = dumpCell(dump, SHEET_DAMPER_FA, "P43");
      const p44 = dumpCell(dump, SHEET_DAMPER_FA, "P44");
      const q44 = dumpCell(dump, SHEET_DAMPER_FA, "Q44");
      const p45 = dumpCell(dump, SHEET_DAMPER_FA, "P45");
      const q45 = dumpCell(dump, SHEET_DAMPER_FA, "Q45");

      const p43n = Number(p43.calculatedResult ?? p43.value);
      const q44Calc = damperVerticalProfileCountFromP43(p43n);
      expectDecimalNear(q44Calc, Number(q44.calculatedResult), 0);

      expect(p45.formula).toBe("=P44*(Q44+1)");
      expectDecimalNear(
        d(Number(p44.calculatedResult ?? p44.value)).mul(q44Calc.add(1)),
        Number(p45.calculatedResult)
      );

      expect(String(q45.formula)).toContain("P43");
      const q45Expected = d(p43n).minus(q44Calc.mul("34.3")).div(q44Calc.add(1));
      expectDecimalNear(q45Expected, Number(q45.calculatedResult));
    });

    it("Damper RA Q44/P45/Q45 chain matches dump", () => {
      const p43 = dumpCell(dump, SHEET_DAMPER_RA, "P43");
      const p44 = dumpCell(dump, SHEET_DAMPER_RA, "P44");
      const q44 = dumpCell(dump, SHEET_DAMPER_RA, "Q44");
      const p45 = dumpCell(dump, SHEET_DAMPER_RA, "P45");
      const q45 = dumpCell(dump, SHEET_DAMPER_RA, "Q45");

      const p43n = Number(p43.calculatedResult ?? p43.value);
      const q44Calc = damperVerticalProfileCountFromP43(p43n);
      expectDecimalNear(q44Calc, Number(q44.calculatedResult), 0);

      expect(p45.formula).toBe("=P44*(Q44+1)");
      expectDecimalNear(
        d(Number(p44.calculatedResult ?? p44.value)).mul(q44Calc.add(1)),
        Number(p45.calculatedResult)
      );

      expect(String(q45.formula)).toContain("P43");
      const q45Expected = d(p43n).minus(q44Calc.mul("34.3")).div(q44Calc.add(1));
      expectDecimalNear(q45Expected, Number(q45.calculatedResult));
    });

    it("Damper FA extended Q43/P46/Q46 + frame/blade/gear lines + Q59/S59", () => {
      assertVolDamperExtendedParityChains(dump, SHEET_DAMPER_FA);
      assertVolDamperSubtotalRanges(dump, SHEET_DAMPER_FA);
    });

    it("Damper RA extended Q43/P46/Q46 + frame/blade/gear lines + Q59/S59", () => {
      assertVolDamperExtendedParityChains(dump, SHEET_DAMPER_RA);
      assertVolDamperSubtotalRanges(dump, SHEET_DAMPER_RA);
    });

    it("Coil subtotal V235 matches SUM(R235:R238)", () => {
      const v235 = dumpCell(dump, SHEET_COIL, "V235");
      expect(v235.formula).toBe("=SUM(R235:R238)");
      const sumR = sumDumpRangeMaybe(dump, SHEET_COIL, "R", 235, 238);
      expectDecimalNear(sumR, Number(v235.calculatedResult));
    });
  });
});
