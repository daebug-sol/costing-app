import {
  canTransitionQuotation,
  isWonLikeQuotationStatus,
  normalizeQuotationStatus,
} from "@/lib/o2c/status";

describe("quotation status transitions", () => {
  it("normalizes legacy finals", () => {
    expect(normalizeQuotationStatus("Final")).toBe("finalized");
    expect(normalizeQuotationStatus("approve")).toBe("approved");
  });

  it("allows draft → sent → won/lost", () => {
    expect(canTransitionQuotation("draft", "sent")).toBe(true);
    expect(canTransitionQuotation("sent", "won")).toBe(true);
    expect(canTransitionQuotation("sent", "lost")).toBe(true);
    expect(canTransitionQuotation("won", "draft")).toBe(false);
  });

  it("treats approved/finalized as won-like", () => {
    expect(isWonLikeQuotationStatus("approved")).toBe(true);
    expect(isWonLikeQuotationStatus("finalized")).toBe(true);
    expect(isWonLikeQuotationStatus("sent")).toBe(false);
  });
});
