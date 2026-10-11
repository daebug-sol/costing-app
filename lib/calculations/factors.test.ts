import type { MaterialPrice } from "./types";
import {
  DEFAULT_COSTING_FACTORS,
  isValidCostingFactor,
  resolveCostingFactors,
} from "./factors";
import { calculateSkid } from "./skid";
import { calculateStructure } from "./structure";

const mat = (code: string, pricePerKg: number) =>
  ({
    code,
    name: code,
    category: "steel",
    density: 7860,
    pricePerKg,
    currency: "IDR",
    unit: "kg",
  }) as MaterialPrice;

describe("resolveCostingFactors", () => {
  it("returns workbook defaults for missing input", () => {
    expect(resolveCostingFactors(undefined)).toEqual(DEFAULT_COSTING_FACTORS);
    expect(resolveCostingFactors(null)).toEqual(DEFAULT_COSTING_FACTORS);
    expect(resolveCostingFactors([])).toEqual(DEFAULT_COSTING_FACTORS);
  });

  it("falls back per key when a value is out of range or not a number", () => {
    expect(
      resolveCostingFactors({ profileWaste: 0.5, linerWaste: "x", plateWaste: 1.2 })
    ).toEqual({ ...DEFAULT_COSTING_FACTORS, plateWaste: 1.2 });
    expect(isValidCostingFactor(2.01)).toBe(false);
    expect(isValidCostingFactor(NaN)).toBe(false);
    expect(isValidCostingFactor(1)).toBe(true);
  });
});

describe("plate waste factor flows into skid/structure", () => {
  const materials = [mat("UNP100-304", 45000), mat("SGCC-1.0", 20000)];

  it("skid output is unchanged at defaults and scales with plateWaste", () => {
    const base = calculateSkid({ W: 1930, D: 1625, materials });
    const explicit = calculateSkid({
      W: 1930,
      D: 1625,
      materials,
      factors: DEFAULT_COSTING_FACTORS,
    });
    expect(explicit).toEqual(base);

    const higher = calculateSkid({
      W: 1930,
      D: 1625,
      materials,
      factors: { plateWaste: 1.3 },
    });
    expect(higher[0]!.qty).toBeCloseTo((base[0]!.qty / 1.15) * 1.3, 9);
    expect(higher[0]!.qtyFormula).toContain("*1.3*");
  });

  it("structure scales with plateWaste", () => {
    const base = calculateStructure({ H: 1200, W: 1900, D: 1600, materials });
    const higher = calculateStructure({
      H: 1200,
      W: 1900,
      D: 1600,
      materials,
      factors: { plateWaste: 1.3 },
    });
    expect(higher[0]!.qty).toBeCloseTo((base[0]!.qty / 1.15) * 1.3, 9);
  });
});
