import type { MaterialPrice } from "./types";
import { calculateStructureWeight } from "./ahu-costing";
import { calculateStructure } from "./structure";
import fs from "fs";
import path from "path";

type DumpCell = { value?: unknown; calculatedResult?: unknown };

function readDumpCell(sheet: string, cell: string): DumpCell {
  const dumpPath = path.join(process.cwd(), "excel-formulas-dump.json");
  const dump = JSON.parse(fs.readFileSync(dumpPath, "utf8")) as {
    sheets: Record<string, { cells?: Record<string, DumpCell> }>;
  };
  const got = dump.sheets[sheet]?.cells?.[cell];
  expect(got).toBeDefined();
  return got as DumpCell;
}

describe("calculateStructure parity baseline", () => {
  const materials = [
    {
      code: "SGCC-1.5",
      name: "GI 1.5",
      category: "raw",
      density: 8030,
      pricePerKg: 20000,
      currency: "IDR",
      unit: "kg",
    },
  ] as MaterialPrice[];

  it("matches line-item structure kg total for baseline dimensions", () => {
    const H = 1420;
    const W = 1930;
    const D = 1625;

    const lines = calculateStructure({ H, W, D, materials });
    const sumKg = lines.reduce((s, it) => s + it.qty, 0);

    const parity = calculateStructureWeight({ H, W, D });
    expect(Math.abs(sumKg - parity.totalKg.toNumber())).toBeLessThan(1e-9);
  });

  it("matches line-item structure kg total for smaller dimensions", () => {
    const H = 1015;
    const W = 1015;
    const D = 900;
    const lines = calculateStructure({ H, W, D, materials });
    const sumKg = lines.reduce((s, it) => s + it.qty, 0);
    const parity = calculateStructureWeight({ H, W, D });
    expect(Math.abs(sumKg - parity.totalKg.toNumber())).toBeLessThan(1e-9);
  });

  it("keeps dump constants aligned for structure sheet rows", () => {
    const giDensity = readDumpCell("3. AHU-Structure", "F18");
    const thickness = readDumpCell("3. AHU-Structure", "C18");
    const stripWidth = readDumpCell("3. AHU-Structure", "D18");
    expect(Number(giDensity.value)).toBe(7860);
    expect(Number(thickness.value)).toBe(1.5);
    expect(Number(stripWidth.calculatedResult ?? stripWidth.value)).toBe(100);
  });

  it("uses workbook density constant in line formulas", () => {
    const lines = calculateStructure({ H: 1420, W: 1930, D: 1625, materials });
    for (const item of lines) {
      expect(item.qtyFormula).toContain("*7860*");
    }
  });

  it("preserves parity at nSections=1 and doubles qty at nSections=2", () => {
    const H = 1420;
    const W = 1930;
    const D = 1625;
    const baseline = calculateStructure({ H, W, D, nSections: 1, materials });
    const doubled = calculateStructure({ H, W, D, nSections: 2, materials });
    expect(baseline).toHaveLength(5);
    expect(doubled).toHaveLength(5);
    for (let i = 0; i < baseline.length; i++) {
      expect(Math.abs(doubled[i]!.qty - baseline[i]!.qty * 2)).toBeLessThan(1e-9);
      expect(Math.abs(doubled[i]!.subtotal - baseline[i]!.subtotal * 2)).toBeLessThan(1e-6);
    }
  });
});

