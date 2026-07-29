import {
  effectiveSectionSubtotal,
  sectionHasPriceOverride,
} from "./section-subtotal";

describe("effectiveSectionSubtotal", () => {
  it("uses calculated subtotal when override is null/undefined", () => {
    expect(effectiveSectionSubtotal({ subtotal: 5_000_000 })).toBe(5_000_000);
    expect(
      effectiveSectionSubtotal({ subtotal: 5_000_000, overrideSubtotal: null })
    ).toBe(5_000_000);
  });

  it("uses override when set (including higher or lower than calc)", () => {
    expect(
      effectiveSectionSubtotal({
        subtotal: 5_000_000,
        overrideSubtotal: 5_100_000,
      })
    ).toBe(5_100_000);
    expect(
      effectiveSectionSubtotal({
        subtotal: 5_000_000,
        overrideSubtotal: 1,
      })
    ).toBe(1);
  });

  it("treats non-finite override as missing", () => {
    expect(
      effectiveSectionSubtotal({
        subtotal: 100,
        overrideSubtotal: Number.NaN,
      })
    ).toBe(100);
  });

  it("reset: clearing override restores calculated price", () => {
    const calculated = 5_000_000;
    const overridden = {
      subtotal: calculated,
      overrideSubtotal: 5_100_000 as number | null,
    };
    expect(effectiveSectionSubtotal(overridden)).toBe(5_100_000);
    overridden.overrideSubtotal = null;
    expect(effectiveSectionSubtotal(overridden)).toBe(calculated);
    expect(sectionHasPriceOverride(overridden)).toBe(false);
  });
});

describe("sectionHasPriceOverride", () => {
  it("is false when override cleared", () => {
    expect(sectionHasPriceOverride({ overrideSubtotal: null })).toBe(false);
    expect(sectionHasPriceOverride({})).toBe(false);
  });

  it("is true when override is a finite number", () => {
    expect(sectionHasPriceOverride({ overrideSubtotal: 0 })).toBe(true);
    expect(sectionHasPriceOverride({ overrideSubtotal: 5_100_000 })).toBe(
      true
    );
  });
});
