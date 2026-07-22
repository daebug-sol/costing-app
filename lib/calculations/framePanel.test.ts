import type { MaterialPrice, ProfileData } from "./types";
import { calculateFramePanel } from "./framePanel";

describe("calculateFramePanel nSections scaling", () => {
  const materials = [
    {
      code: "SGCC-1.0",
      name: "GI 1.0",
      category: "raw",
      density: 7850,
      pricePerKg: 18000,
      currency: "IDR",
      unit: "kg",
    },
    {
      code: "PU-FOAM",
      name: "PU Foam",
      category: "insulation",
      density: 40,
      pricePerKg: 45000,
      currency: "IDR",
      unit: "kg",
    },
  ] as MaterialPrice[];

  const profiles = [
    {
      code: "5060Y-NA06",
      type: "Pentapost",
      weightPerM: 2.2,
      pricePerM: 145_000,
      panelThick: 50,
    },
    {
      code: "INTER-40",
      type: "Interpost",
      weightPerM: 1.1,
      pricePerM: 90_000,
      panelThick: null,
    },
    {
      code: "CLIP-01",
      type: "Clip",
      weightPerM: 0.4,
      pricePerM: 35_000,
      panelThick: null,
    },
  ] as ProfileData[];

  const baseParams = {
    H: 1420,
    W: 1930,
    D: 1625,
    profileType: "5060Y-NA06",
    materials,
    profiles,
  };

  it("preserves baseline at nSections=1 and doubles all line qtys at nSections=2", () => {
    const one = calculateFramePanel({ ...baseParams, nSections: 1 });
    const two = calculateFramePanel({ ...baseParams, nSections: 2 });
    expect(one.length).toBeGreaterThan(0);
    expect(two).toHaveLength(one.length);
    for (let i = 0; i < one.length; i++) {
      expect(Math.abs(two[i]!.qty - one[i]!.qty * 2)).toBeLessThan(1e-9);
      expect(Math.abs(two[i]!.subtotal - one[i]!.subtotal * 2)).toBeLessThan(1e-6);
    }
  });

  it("does not square-scale Interpost when nSections>1", () => {
    const one = calculateFramePanel({ ...baseParams, nSections: 1 });
    const two = calculateFramePanel({ ...baseParams, nSections: 2 });
    const interOne = one.filter((r) => r.description.startsWith("Interpost"));
    const interTwo = two.filter((r) => r.description.startsWith("Interpost"));
    expect(interOne.length).toBeGreaterThan(0);
    for (let i = 0; i < interOne.length; i++) {
      // Exactly 2×, not 4× (which would happen if Interpost still had an inner *nSec)
      expect(Math.abs(interTwo[i]!.qty - interOne[i]!.qty * 2)).toBeLessThan(1e-9);
      expect(Math.abs(interTwo[i]!.qty - interOne[i]!.qty * 4)).toBeGreaterThan(1e-6);
    }
  });
});
