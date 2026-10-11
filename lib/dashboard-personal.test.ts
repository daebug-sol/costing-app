import { parseMonthlyTarget } from "@/lib/dashboard-personal";

describe("parseMonthlyTarget", () => {
  it("accepts null (clear), zero and positive finite numbers", () => {
    expect(parseMonthlyTarget(null)).toBeNull();
    expect(parseMonthlyTarget(0)).toBe(0);
    expect(parseMonthlyTarget(450_000_000)).toBe(450_000_000);
  });

  it("rejects negatives, non-numbers and non-finite values", () => {
    for (const bad of [-1, "abc", "450", Number.NaN, Number.POSITIVE_INFINITY, undefined, {}]) {
      expect(parseMonthlyTarget(bad)).toBe("invalid");
    }
  });
});
