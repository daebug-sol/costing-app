import type { ComponentCatalog, MaterialPrice, ProfileData } from "@prisma/client";
import fs from "fs";
import path from "path";
import { computeAhuSegmentCostingBlocks } from "./ahu-segment-costing";
import { normalizeCostingScope } from "./costing-scope";
import {
  calculateCoil,
  calculateDamper,
  calculateDrainPan,
  calculateFramePanel,
  calculateSkid,
  calculateStructure,
} from "./calculations";

function material(code: string, name: string, pricePerKg: number): MaterialPrice {
  return {
    id: code,
    code,
    name,
    category: "raw",
    density: 1000,
    pricePerKg,
    currency: "IDR",
    unit: "kg",
    notes: null,
    updatedAt: new Date(),
    createdAt: new Date(),
  };
}

function profile(code: string, type: string, weightPerM: number, pricePerM: number): ProfileData {
  return {
    id: code,
    code,
    name: code,
    type,
    weightPerM,
    pricePerM,
    panelThick: null,
    notes: null,
    updatedAt: new Date(),
    createdAt: new Date(),
  };
}

function component(
  code: string,
  name: string,
  category: string,
  unitPrice: number,
  unit = "pcs"
): ComponentCatalog {
  return {
    id: code,
    code,
    name,
    category,
    subcategory: null,
    brand: null,
    model: null,
    spec: null,
    unitPrice,
    currency: "IDR",
    unit,
    moq: null,
    leadTimeDays: null,
    supplier: null,
    notes: null,
    updatedAt: new Date(),
    createdAt: new Date(),
  };
}

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

describe("computeAhuSegmentCostingBlocks", () => {
  const materials: MaterialPrice[] = [
    material("SGCC-1.0", "GI", 18_000),
    material("SGCC-1.5", "GI 1.5", 20_000),
    material("SUS304-1.5", "SS304", 55_000),
    material("UNP125-304", "UNP125", 24_000),
    material("SS316-SHAFT-M12", "Shaft", 70_570.5),
    material("AL6063", "Aluminium", 52_000),
    material("AL-FIN", "Al Fin", 62_000),
    material("COPPER-TUBE", "Copper", 120_000),
  ];
  const profiles: ProfileData[] = [
    profile("5060Y-NA06", "Pentapost", 2.2, 145_000),
    profile("AL-BASE", "aluminium", 0.35, 70_000),
  ];
  const components: ComponentCatalog[] = [
    component("ACCESS-DOOR-SET", "Access Door Set", "door", 1_000_000, "set"),
    component("DAMPER-SET", "Oppose blade damper", "damper", 380_000, "set"),
    component("PANEL-FILTER-G4", "Panel Filter G4", "filter", 220_000),
    component("BAG-FILTER-F8", "Bag Filter F8", "filter", 430_000),
    component("HEATER-SET", "Electric heater", "heater", 2_500_000, "set"),
    component("OPENING-SET", "Inlet opening", "opening", 190_000, "set"),
    component("FAN-355", "Plenum Fan", "fan", 3_200_000),
    component("MOTOR-3KW-2P", "Motor 3kW 2P", "motor", 2_000_000),
    component("SPRING-ISOLATOR", "Spring Isolator", "mount", 85_000),
  ];

  it("builds items only for selected modules in partial scope", () => {
    const blocks = computeAhuSegmentCostingBlocks({
      dimH: 1015,
      dimW: 1015,
      dimD: 1625,
      profileType: "5060Y-NA06",
      segmentQty: 1,
      nSections: 2,
      scope: normalizeCostingScope({
        isFullAhu: false,
        includeCoil: true,
        includeFilters: true,
        includeOpening: true,
      }),
      mergedParams: {
        filters: { panelQty: 1, bagQty: 1, panelClass: "G4", bagClass: "F8" },
        coil: { FH: 762, FL: 733, rows: 6, FPI: 10, circuits: 1 },
        opening: { qty: 1, width: 576, height: 881 },
      },
      materials,
      profiles,
      components,
    });

    const byCategory = new Map(blocks.map((b) => [b.category, b.items.length]));
    expect(byCategory.get("Coil")).toBeGreaterThan(0);
    expect(byCategory.get("Filters")).toBeGreaterThan(0);
    expect(byCategory.get("Inlet/Outlet Opening")).toBeGreaterThan(0);
    expect(byCategory.get("Frame & Panel")).toBe(0);
    expect(byCategory.get("Fan & Motor")).toBe(0);
  });

  it("matches golden subtotal parity for core modules at 1420/1930/1625", () => {
    const dimH = 1420;
    const dimW = 1930;
    const dimD = 1625;
    const blocks = computeAhuSegmentCostingBlocks({
      dimH,
      dimW,
      dimD,
      profileType: "5060Y-NA06",
      segmentQty: 1,
      nSections: 2,
      scope: normalizeCostingScope({ isFullAhu: true }),
      mergedParams: {
        coil: { FH: 762, FL: 733, rows: 6, FPI: 10, circuits: 1 },
        damper: { W: dimW, H: dimH, includeFA: true, includeRA: true },
      },
      materials,
      profiles,
      components,
    });

    const subtotalByCategory = new Map(
      blocks.map((b) => [b.category, b.items.reduce((sum, item) => sum + item.subtotal, 0)])
    );

    const expected = new Map<string, number>([
      [
        "Frame & Panel",
        calculateFramePanel({
          H: dimH,
          W: dimW,
          D: dimD,
          profileType: "5060Y-NA06",
          nSections: 2,
          materials,
          profiles,
        }).reduce((sum, item) => sum + item.subtotal, 0),
      ],
      ["Skid", calculateSkid({ W: dimW, D: dimD, materials }).reduce((sum, item) => sum + item.subtotal, 0)],
      [
        "Structure",
        calculateStructure({ H: dimH, W: dimW, D: dimD, materials }).reduce(
          (sum, item) => sum + item.subtotal,
          0
        ),
      ],
      [
        "Drain Pan",
        calculateDrainPan({ H: dimH, W: dimW, D: dimD, materials }).reduce((sum, item) => sum + item.subtotal, 0),
      ],
      [
        "Coil",
        calculateCoil({
          FH: 762,
          FL: 733,
          rows: 6,
          FPI: 10,
          circuits: 1,
          materials,
        }).reduce((sum, item) => sum + item.subtotal, 0),
      ],
      [
        "Damper",
        [
          ...calculateDamper({ W: dimW, H: dimH, type: "FA", profiles, materials, components }),
          ...calculateDamper({ W: dimW, H: dimH, type: "RA", profiles, materials, components }),
        ].reduce((sum, item) => sum + item.subtotal, 0),
      ],
    ]);

    for (const [category, expectedSubtotal] of expected.entries()) {
      const actual = subtotalByCategory.get(category) ?? 0;
      expect(Math.abs(actual - expectedSubtotal)).toBeLessThan(1e-6);
    }
  });

  it("keeps structure subtotal aligned with dump-backed density baseline", () => {
    const h = Number(readDumpCell("3. AHU-Structure", "C2").value);
    const w = Number(readDumpCell("3. AHU-Structure", "D2").value);
    const d = Number(readDumpCell("3. AHU-Structure", "E2").value);
    const blocks = computeAhuSegmentCostingBlocks({
      dimH: h,
      dimW: w,
      dimD: d,
      profileType: "5060Y-NA06",
      segmentQty: 1,
      nSections: 2,
      scope: normalizeCostingScope({ isFullAhu: false, includeStructure: true }),
      mergedParams: {},
      materials,
      profiles,
      components,
    });
    const structure = blocks.find((b) => b.category === "Structure");
    expect(structure).toBeDefined();
    const actualSubtotal = (structure?.items ?? []).reduce((sum, item) => sum + item.subtotal, 0);

    const expectedSubtotal = calculateStructure({ H: h, W: w, D: d, materials }).reduce(
      (sum, it) => sum + it.subtotal,
      0
    );
    expect(Math.abs(actualSubtotal - expectedSubtotal)).toBeLessThan(1e-6);
  });
});
