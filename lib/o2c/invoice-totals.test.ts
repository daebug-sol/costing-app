import {
  computeInvoiceTotals,
  invoiceStatusFromPaid,
} from "@/lib/o2c/invoice-totals";

describe("computeInvoiceTotals", () => {
  it("applies percent discount then PPN on DPP", () => {
    const t = computeInvoiceTotals({
      lineTotals: [1000, 500],
      discountPct: 10,
      ppnPct: 11,
    });
    expect(t.subtotal).toBe(1500);
    expect(t.discountAmt).toBe(150);
    expect(t.dpp).toBe(1350);
    expect(t.ppn).toBe(148.5);
    expect(t.grandTotal).toBe(1498.5);
  });

  it("combines percent and absolute discount capped at subtotal", () => {
    const t = computeInvoiceTotals({
      lineTotals: [100],
      discountPct: 10,
      discountAmt: 20,
      ppnPct: 0,
    });
    expect(t.discountAmt).toBe(30);
    expect(t.dpp).toBe(70);
    expect(t.grandTotal).toBe(70);
  });

  it("adds optional PPH on DPP", () => {
    const t = computeInvoiceTotals({
      lineTotals: [1000],
      discountPct: 0,
      ppnPct: 11,
      pphPct: 2,
    });
    expect(t.dpp).toBe(1000);
    expect(t.ppn).toBe(110);
    expect(t.pph).toBe(20);
    expect(t.grandTotal).toBe(1130);
  });
});

describe("invoiceStatusFromPaid", () => {
  it("maps paid / partial / sent", () => {
    expect(invoiceStatusFromPaid(1000, 0, "sent")).toBe("sent");
    expect(invoiceStatusFromPaid(1000, 400, "sent")).toBe("partially_paid");
    expect(invoiceStatusFromPaid(1000, 1000, "sent")).toBe("paid");
    expect(invoiceStatusFromPaid(1000, 100, "void")).toBe("void");
    expect(invoiceStatusFromPaid(1000, 100, "draft")).toBe("draft");
  });
});
