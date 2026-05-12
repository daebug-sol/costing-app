import type { MaterialPrice } from "./types";
import { calculateStructureWeight } from "./ahu-costing";
import { calculateStructure } from "./structure";
import { structureSheetOracleNutKg, structureShellNutMassKg } from "./structure-workbook";
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
      density: 7860,
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
    expect(structureSheetOracleNutKg(H, W, D)).toBeCloseTo(132.6352999285714, 4);
    expect(Math.abs(structureShellNutMassKg(H, W, D) - parity.totalKg.toNumber())).toBeLessThan(1e-9);
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

  it("embeds sheet density (7860 GI / 7980 stopper) in qtyFormula", () => {
    const lines = calculateStructure({ H: 1420, W: 1930, D: 1625, materials });
    const giLines = lines.filter((it) => it.componentRef === "SGCC-1.5");
    expect(giLines.length).toBeGreaterThan(0);
    for (const item of giLines) {
      expect(item.qtyFormula).toMatch(/7860|7980/);
    }
  });
});

