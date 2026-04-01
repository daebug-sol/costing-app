/**
 * Parity tests: TypeScript calculators vs Costing AHU DS50.xlsx (golden values from excel-formulas-dump.json).
 *
 * Unit under test: "Section 1" on sheet `2. AHU-Frame & Panel` with H=1420, W=1930, D=1625 mm
 * (same numeric inputs as the workbook row tied to AHU IU1 in the live file — that sheet name is not in the formula dump).
 */

import Decimal from "decimal.js";
import {
  calculateCoilRowJ211,
  coilCostRoundUpSample,
  drainPanCylinderMassSample,
  framePanelAirflowM3hFromI3,
  framePanelI3FromI4,
} from "./ahu-costing";
import { d } from "./excel-math";

/** Max |a − b| for currency / weights / intermediate decimals (Rupiah-scale). */
const EPS = 0.01;

function expectDecimalNear(actual: Decimal, expected: Decimal.Value, epsilon = EPS): void {
  const diff = actual.minus(expected).abs();
  expect(diff.lte(epsilon)).toBe(true);
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
});
