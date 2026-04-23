import type { ComponentCatalog, MaterialPrice, ProfileData } from "@prisma/client";
import { computeAhuSegmentCostingBlocks } from "./ahu-segment-costing";
import { normalizeCostingScope } from "./costing-scope";

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

describe("computeAhuSegmentCostingBlocks", () => {
  const materials: MaterialPrice[] = [
    material("SGCC-1.0", "GI", 18_000),
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
});
