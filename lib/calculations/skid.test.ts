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

  it("matches workbook skid line masses (J18:J20) for baseline W/D", () => {
    const W = 1930;
    const D = 1625;

    const rows = calculateSkid({ W, D, materials });
    expect(rows).toHaveLength(3);

    const I = 1.15;
    const steelD = 7860;

    /** Workbook J = H*I where H is steel mass from section dims (no K in J). */
    const Jqty = (c: number, dMm: number, e: number) =>
      (c / 1000) * (dMm / 1000) * (e / 1000) * steelD * I;

    expect(Math.abs(rows[0]!.qty - Jqty(3, 300, D))).toBeLessThan(1e-9);
    expect(Math.abs(rows[1]!.qty - Jqty(3, 300, W))).toBeLessThan(1e-9);
    expect(Math.abs(rows[2]!.qty - Jqty(2, 260, W))).toBeLessThan(1e-9);
  });

  it("matches closed-form subtotal for a smaller skid scenario", () => {
    const W = 1015;
    const D = 900;
    const rows = calculateSkid({ W, D, materials });
    const price = materials[0]!.pricePerKg;
    const K = 2;
    const subtotal = rows.reduce((sum, row) => sum + row.subtotal, 0);
    const jSum = rows.reduce((sum, row) => sum + row.qty, 0);
    expect(Math.abs(subtotal - jSum * K * price)).toBeLessThan(1e-6);
  });
});
