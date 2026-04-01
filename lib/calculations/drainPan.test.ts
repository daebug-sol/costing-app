import type { MaterialPrice } from "./types";
import { calculateDrainPanCost } from "./ahu-costing";
import { calculateDrainPan } from "./drainPan";

describe("calculateDrainPan", () => {
  it("matches Decimal parity total weight for SS304 lines", () => {
    const H = 1420;
    const W = 1930;
    const D = 1625;
    const materials = [
      {
        code: "SUS304-1.5",
        name: "SS304",
        category: "SS",
        density: 8000,
        pricePerKg: 50000,
        currency: "IDR",
        unit: "kg",
      },
    ] as MaterialPrice[];
    const items = calculateDrainPan({ H, W, D, materials });
    const sumKg = items.reduce((s, it) => s + it.qty, 0);
    const { weightKg } = calculateDrainPanCost({
      H,
      W,
      D,
      pricePerKgSs304: 50000,
    });
    expect(Math.abs(sumKg - weightKg.toNumber()) < 0.0001).toBe(true);
  });
});
