import { costingErrorMessage } from "./costing-error-message";

const DEFAULT = "Terjadi kesalahan. Coba lagi.";

describe("costingErrorMessage", () => {
  it("uses a readable Error message", () => {
    expect(costingErrorMessage(new Error("Proyek tidak ada"))).toBe("Proyek tidak ada");
  });

  it("uses a plain string", () => {
    expect(costingErrorMessage("boom")).toBe("boom");
  });

  it("falls back for empty or unknown values", () => {
    expect(costingErrorMessage(new Error(""))).toBe(DEFAULT);
    expect(costingErrorMessage(undefined)).toBe(DEFAULT);
    expect(costingErrorMessage({})).toBe(DEFAULT);
  });

  it("hides raw JS error names", () => {
    expect(costingErrorMessage(new Error("TypeError: Failed to fetch"))).toBe(DEFAULT);
  });

  it("accepts a custom fallback", () => {
    expect(costingErrorMessage(undefined, "Gagal menyimpan")).toBe("Gagal menyimpan");
  });
});

describe("costingErrorMessage network errors", () => {
  it("hides raw browser fetch failures", () => {
    expect(costingErrorMessage(new Error("Failed to fetch"))).toBe(
      "Terjadi kesalahan. Coba lagi."
    );
    expect(costingErrorMessage(new Error("NetworkError when attempting to fetch resource."))).toBe(
      "Terjadi kesalahan. Coba lagi."
    );
  });
});
