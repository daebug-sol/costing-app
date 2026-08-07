import {
  fifoAllocate,
  validateAllocations,
} from "@/lib/o2c/payment-allocation";

const open = [
  {
    id: "inv-late",
    grandTotal: 500,
    paidTotal: 0,
    dueDate: "2026-06-01",
  },
  {
    id: "inv-soon",
    grandTotal: 300,
    paidTotal: 100,
    dueDate: "2026-07-01",
  },
  {
    id: "inv-open",
    grandTotal: 200,
    paidTotal: 0,
    dueDate: null,
  },
];

describe("payment allocation", () => {
  it("FIFO allocates by dueDate then id", () => {
    const lines = fifoAllocate(open, 650);
    expect(lines).toEqual([
      { invoiceId: "inv-late", amount: 500 },
      { invoiceId: "inv-soon", amount: 150 },
    ]);
  });

  it("accepts valid manual allocations", () => {
    const ok = validateAllocations(400, open, [
      { invoiceId: "inv-soon", amount: 200 },
      { invoiceId: "inv-open", amount: 200 },
    ]);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.total).toBe(400);
  });

  it("rejects over-payment against a single invoice", () => {
    const bad = validateAllocations(1000, open, [
      { invoiceId: "inv-soon", amount: 250 },
    ]);
    expect(bad.ok).toBe(false);
  });

  it("rejects allocation sum exceeding payment amount", () => {
    const bad = validateAllocations(100, open, [
      { invoiceId: "inv-late", amount: 80 },
      { invoiceId: "inv-open", amount: 50 },
    ]);
    expect(bad.ok).toBe(false);
  });
});
