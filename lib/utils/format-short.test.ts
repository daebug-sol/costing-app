import { formatRpShort } from "@/lib/utils/format";

describe("formatRpShort", () => {
  it("abbreviates millions and billions in Indonesian style", () => {
    expect(formatRpShort(270_000_000)).toBe("Rp 270 jt");
    expect(formatRpShort(180_000_000)).toBe("Rp 180 jt");
    expect(formatRpShort(1_400_000_000)).toBe("Rp 1,4 M");
    expect(formatRpShort(2_000_000_000)).toBe("Rp 2 M");
  });

  it("falls back to full rupiah below one million and guards bad numbers", () => {
    expect(formatRpShort(0)).toBe("Rp 0");
    expect(formatRpShort(Number.NaN)).toBe("—");
    expect(formatRpShort(-5_000_000)).toBe("-Rp 5 jt");
  });
});
