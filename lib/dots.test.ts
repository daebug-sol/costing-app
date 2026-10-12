import { fitDotGrid, meterFill, monotoneCurvePath, ringDotPositions } from "@/lib/dots";

describe("fitDotGrid", () => {
  it("fills a wide box with one row of equal cells when count is small", () => {
    expect(fitDotGrid(4, 400, 100)).toEqual({ cols: 4, rows: 1, cell: 100 });
  });

  it("shrinks the cell as the count grows and never overflows the box", () => {
    const few = fitDotGrid(12, 300, 200);
    const many = fitDotGrid(120, 300, 200);
    expect(many.cell).toBeLessThan(few.cell);
    for (const g of [few, many]) {
      expect(g.cols * g.cell).toBeLessThanOrEqual(300 + 1e-9);
      expect(g.rows * g.cell).toBeLessThanOrEqual(200 + 1e-9);
      expect(g.cols * g.rows).toBeGreaterThanOrEqual(g === few ? 12 : 120);
    }
  });

  it("returns an empty grid for zero count or an unmeasured box", () => {
    expect(fitDotGrid(0, 300, 200)).toEqual({ cols: 0, rows: 0, cell: 0 });
    expect(fitDotGrid(10, 0, 200)).toEqual({ cols: 0, rows: 0, cell: 0 });
  });
});

describe("meterFill", () => {
  it("lights a proportional number of dots, at least one for any positive value", () => {
    expect(meterFill(50, 20)).toEqual({ lit: 10, pointer: null });
    expect(meterFill(0.1, 20).lit).toBe(1);
    expect(meterFill(0, 20).lit).toBe(0);
  });

  it("clamps out-of-range and non-finite input", () => {
    expect(meterFill(180, 10).lit).toBe(10);
    expect(meterFill(-5, 10).lit).toBe(0);
    expect(meterFill(Number.NaN, 10).lit).toBe(0);
  });

  it("places the pace pointer inside the meter", () => {
    expect(meterFill(60, 30, 35).pointer).toBe(10);
    expect(meterFill(60, 30, 100).pointer).toBe(29);
    expect(meterFill(60, 30, null).pointer).toBeNull();
  });
});

describe("ringDotPositions", () => {
  it("returns n dots, the first at 12 o'clock, with lit count from pct", () => {
    const dots = ringDotPositions(72, 60, 70, 160);
    expect(dots).toHaveLength(72);
    expect(dots[0]!.x).toBeCloseTo(80, 5);
    expect(dots[0]!.y).toBeCloseTo(10, 5);
    expect(dots.filter((d) => d.lit)).toHaveLength(43);
  });
});

describe("monotoneCurvePath", () => {
  it("passes through every point and never overshoots a flat run", () => {
    const d = monotoneCurvePath([
      [0, 10],
      [10, 10],
      [20, 30],
      [30, 30],
    ]);
    expect(d.startsWith("M0,10")).toBe(true);
    expect(d.endsWith("30,30")).toBe(true);
    const ys = [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(10 - 1e-9);
    expect(Math.max(...ys)).toBeLessThanOrEqual(30 + 1e-9);
  });

  it("handles one point and no points", () => {
    expect(monotoneCurvePath([])).toBe("");
    expect(monotoneCurvePath([[5, 5]])).toBe("M5,5");
  });
});
