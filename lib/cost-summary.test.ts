import { computeCostSummary } from "@/lib/cost-summary";

const baseMargins = {
  overhead: 5,
  contingency: 3,
  eskalasi: 0,
  asuransi: 0,
  mobilisasi: 0,
  margin: 20,
};

const togglesOff = { esk: false, asu: false, mob: false };

describe("computeCostSummary price adjustment", () => {
  /** HPP 1000 → OH 50 + Cont 30 = 1080 cost; margin 20% = 216; selling base = 1296 */
  const hpp = 1000;
  const sellingBase = 1296;

  it("leaves selling unchanged when pct and amt are zero / omitted", () => {
    const a = computeCostSummary(hpp, 1, baseMargins, togglesOff);
    const b = computeCostSummary(
      hpp,
      1,
      { ...baseMargins, priceAdjustmentPct: 0, priceAdjustmentAmt: 0 },
      togglesOff
    );
    expect(a.selling).toBe(sellingBase);
    expect(b.selling).toBe(sellingBase);
    expect(a.sellingBeforeAdjustment).toBe(sellingBase);
    expect(a.adjPctAmt).toBe(0);
    expect(a.adjFlatAmt).toBe(0);
  });

  it("applies percent-only adjustment after margin", () => {
    const s = computeCostSummary(
      hpp,
      1,
      { ...baseMargins, priceAdjustmentPct: 5, priceAdjustmentAmt: 0 },
      togglesOff
    );
    expect(s.sellingBeforeAdjustment).toBe(sellingBase);
    expect(s.adjPctAmt).toBeCloseTo(sellingBase * 0.05, 6);
    expect(s.adjFlatAmt).toBe(0);
    expect(s.selling).toBeCloseTo(sellingBase * 1.05, 6);
  });

  it("applies absolute Rp-only adjustment after margin", () => {
    const s = computeCostSummary(
      hpp,
      1,
      { ...baseMargins, priceAdjustmentPct: 0, priceAdjustmentAmt: 1_000_000 },
      togglesOff
    );
    expect(s.sellingBeforeAdjustment).toBe(sellingBase);
    expect(s.adjPctAmt).toBe(0);
    expect(s.adjFlatAmt).toBe(1_000_000);
    expect(s.selling).toBe(sellingBase + 1_000_000);
  });

  it("applies pct first then absolute amount when both set", () => {
    const s = computeCostSummary(
      hpp,
      1,
      { ...baseMargins, priceAdjustmentPct: 5, priceAdjustmentAmt: 1_000_000 },
      togglesOff
    );
    expect(s.selling).toBeCloseTo(sellingBase * 1.05 + 1_000_000, 6);
    expect(s.perUnit).toBeCloseTo(s.selling, 6);
  });

  it("divides final selling by qty for perUnit", () => {
    const s = computeCostSummary(
      hpp,
      2,
      { ...baseMargins, priceAdjustmentPct: 10, priceAdjustmentAmt: 100 },
      togglesOff
    );
    expect(s.perUnit).toBeCloseTo(s.selling / 2, 6);
  });
});
