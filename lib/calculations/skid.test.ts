import type { MaterialPrice } from "./types";
import { calculateSkid } from "./skid";

describe("calculateSkid parity baseline", () => {
  const materials = [
    {
      code: "UNP100-304",
      name: "UNP100",
      category: "steel",
      density: 7860,
      pricePerKg: 45000,
      currency: "IDR",
      unit: "kg",
    },
  ] as MaterialPrice[];

  it("matches closed-form kg formulas for baseline W/D", () => {
    const W = 1930;
    const D = 1625;

    const rows = calculateSkid({ W, D, materials });
    expect(rows).toHaveLength(3);

    const lr = rows[0]!.qty;
    const fb = rows[1]!.qty;
    const center = rows[2]!.qty;

    const expectedLr = 0.003 * 0.1 * (D / 1000) * 7860 * 1.15 * 2;
    const expectedFb = 0.003 * 0.1 * (W / 1000) * 7860 * 1.15 * 2;
    const expectedCenter = 0.002 * 0.08 * (W / 1000) * 7860 * 1.15 * 2;

    expect(Math.abs(lr - expectedLr)).toBeLessThan(1e-9);
    expect(Math.abs(fb - expectedFb)).toBeLessThan(1e-9);
    expect(Math.abs(center - expectedCenter)).toBeLessThan(1e-9);
  });

  it("matches closed-form subtotal for a smaller skid scenario", () => {
    const W = 1015;
    const D = 900;
    const rows = calculateSkid({ W, D, materials });
    const subtotal = rows.reduce((sum, row) => sum + row.qty, 0);
    const expectedSubtotal =
      0.003 * 0.1 * (D / 1000) * 7860 * 1.15 * 2 +
      0.003 * 0.1 * (W / 1000) * 7860 * 1.15 * 2 +
      0.002 * 0.08 * (W / 1000) * 7860 * 1.15 * 2;
    expect(Math.abs(subtotal - expectedSubtotal)).toBeLessThan(1e-9);
  });

  it("preserves parity at nSections=1 and doubles qty at nSections=2", () => {
    const W = 1930;
    const D = 1625;
    const baseline = calculateSkid({ W, D, nSections: 1, materials });
    const doubled = calculateSkid({ W, D, nSections: 2, materials });
    expect(baseline).toHaveLength(3);
    expect(doubled).toHaveLength(3);
    for (let i = 0; i < baseline.length; i++) {
      expect(Math.abs(doubled[i]!.qty - baseline[i]!.qty * 2)).toBeLessThan(1e-9);
      expect(Math.abs(doubled[i]!.subtotal - baseline[i]!.subtotal * 2)).toBeLessThan(1e-6);
    }
  });
});
