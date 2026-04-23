import type { ComponentCatalog } from "@prisma/client";
import {
  calculateAccessDoor,
  calculateElectricHeater,
  calculateFilters,
  calculateMixingBox,
  calculateOpenings,
} from "./pdf-modules";

function comp(
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

describe("pdf modules calculators", () => {
  const components: ComponentCatalog[] = [
    comp("ACCESS-DOOR-SET", "Access Door Set", "door", 1_000_000, "set"),
    comp("DOOR-GASKET", "Door gasket", "door", 15_000, "m"),
    comp("WINDOW-KIT", "Door window kit", "door", 120_000, "pcs"),
    comp("DAMPER-SET", "Oppose blade damper", "damper", 350_000, "set"),
    comp("MIXING-LINK", "Mixing box linkage", "mixing", 90_000, "set"),
    comp("MIXING-BOX", "Mixing box set", "mixing", 500_000, "set"),
    comp("PANEL-FILTER-G4", "Panel Filter G4", "filter", 210_000, "pcs"),
    comp("BAG-FILTER-F8", "Bag Filter F8", "filter", 420_000, "pcs"),
    comp("HEATER-SET", "Electric heater", "heater", 2_500_000, "set"),
    comp("HEATER-CONTROL", "Heater control", "heater", 400_000, "set"),
    comp("OPENING-SET", "Inlet opening", "opening", 190_000, "set"),
    comp("FLEX-CONN", "Flexible connector", "opening", 80_000, "pcs"),
  ];

  it("calculates access door rows with optional window", () => {
    const rows = calculateAccessDoor({
      qty: 2,
      height: 881,
      width: 576,
      withWindow: true,
      components,
    });
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.some((r) => r.description.includes("window"))).toBe(true);
  });

  it("builds mixing box rows only for configured dampers", () => {
    const rows = calculateMixingBox({
      faFlowCMH: 1100,
      raFlowCMH: 3300,
      faDamperW: 210,
      faDamperH: 300,
      raDamperW: 0,
      raDamperH: 0,
      components,
    });
    expect(rows.some((r) => r.description.includes("FA"))).toBe(true);
    expect(rows.some((r) => r.description.includes("RA"))).toBe(false);
  });

  it("creates filter rows using class match", () => {
    const rows = calculateFilters({
      panelQty: 1,
      bagQty: 1,
      panelClass: "G4",
      bagClass: "F8",
      components,
    });
    expect(rows[0]?.unitPrice).toBeGreaterThan(0);
    expect(rows[1]?.unitPrice).toBeGreaterThan(0);
  });

  it("uses heater fallback when no component is found", () => {
    const rows = calculateElectricHeater({
      width: 733,
      height: 762,
      depth: 180,
      steps: 2,
      totalLoadKW: 12,
      components: [],
    });
    expect(rows[0]?.unitPrice).toBeGreaterThan(0);
  });

  it("adds opening accessories only when selected", () => {
    const rows = calculateOpenings({
      qty: 2,
      width: 576,
      height: 881,
      includeFlex: true,
      includeLouvre: false,
      includeWireGauze: false,
      includeActuator: false,
      components,
    });
    expect(rows.length).toBe(2);
  });
});
