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

import { buildPersonalSummary } from "@/lib/dashboard-personal";

const NOW = new Date("2026-10-11T10:00:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

const base = {
  now: NOW,
  monthlyTarget: 450_000_000 as number | null,
  revenueSeries: [
    { month: "2026-08", bookedRevenue: 420_000_000 },
    { month: "2026-09", bookedRevenue: 390_000_000 },
    { month: "2026-10", bookedRevenue: 270_000_000 },
  ],
  quotations: [],
  invoices: [],
  salesOrders: [],
};

describe("buildPersonalSummary: target and pace", () => {
  it("computes remaining, progress, ideal pace and best month", () => {
    const p = buildPersonalSummary(base);
    expect(p.bookedThisMonth).toBe(270_000_000);
    expect(p.remaining).toBe(180_000_000);
    expect(p.progressPct).toBeCloseTo(60, 5);
    expect(p.idealPct).toBeCloseTo((11 / 31) * 100, 5);
    expect(p.paceDeltaValue).toBeCloseTo(270_000_000 - 450_000_000 * (11 / 31), 0);
    expect(p.bestMonth).toEqual({ month: "2026-08", booked: 420_000_000 });
    expect(p.daysLeftInMonth).toBe(20);
  });

  it("has no progress numbers without a usable target", () => {
    for (const monthlyTarget of [null, 0]) {
      const p = buildPersonalSummary({ ...base, monthlyTarget });
      expect(p.progressPct).toBeNull();
      expect(p.remaining).toBeNull();
      expect(p.paceDeltaValue).toBeNull();
      expect(p.bookedThisMonth).toBe(270_000_000);
    }
  });

  it("handles an empty history and never negative remaining", () => {
    const empty = buildPersonalSummary({ ...base, revenueSeries: [] });
    expect(empty.bookedThisMonth).toBe(0);
    expect(empty.bestMonth).toBeNull();
    const over = buildPersonalSummary({ ...base, monthlyTarget: 100_000_000 });
    expect(over.remaining).toBe(0);
    expect(over.progressPct).toBeCloseTo(270, 5);
  });
});

describe("buildPersonalSummary: follow-ups", () => {
  it("lists an overdue invoice with days overdue and skips paid or void ones", () => {
    const p = buildPersonalSummary({
      ...base,
      invoices: [
        { id: "i1", invNumber: "INV-0412", customerName: "PT Arga", dueDate: day("2026-10-10"), grandTotal: 100, paidTotal: 20, status: "sent" },
        { id: "i2", invNumber: "INV-0001", customerName: "PT X", dueDate: day("2026-10-01"), grandTotal: 100, paidTotal: 100, status: "paid" },
        { id: "i3", invNumber: "INV-0002", customerName: "PT Y", dueDate: day("2026-10-01"), grandTotal: 100, paidTotal: 0, status: "void" },
      ],
    });
    expect(p.followUps).toEqual([
      { id: "i1", kind: "invoice-overdue", ref: "INV-0412", party: "PT Arga", dueLabel: "overdue", overdueDays: 1 },
    ]);
  });

  it("flags quotations that expire today or tomorrow, not later or booked ones", () => {
    const p = buildPersonalSummary({
      ...base,
      quotations: [
        { id: "q1", status: "draft", tanggal: day("2026-09-27"), validityDays: 15, clientLabel: "PT Sinar", ref: "QT-1" },
        { id: "q2", status: "draft", tanggal: day("2026-10-01"), validityDays: 30, clientLabel: "PT Lama", ref: "QT-2" },
        { id: "q3", status: "approved", tanggal: day("2026-09-27"), validityDays: 15, clientLabel: "PT Won", ref: "QT-3" },
      ],
    });
    expect(p.followUps.map((f) => [f.id, f.dueLabel])).toEqual([["q1", "tomorrow"]]);
    expect(p.expiringQuotationCount).toBe(1);
  });

  it("flags open sales orders older than 7 days and counts yesterday's orders", () => {
    const p = buildPersonalSummary({
      ...base,
      salesOrders: [
        { id: "s1", soNumber: "SO-1", clientLabel: "PT Tirta", status: "open", tanggal: day("2026-10-01") },
        { id: "s2", soNumber: "SO-2", clientLabel: "PT Baru", status: "open", tanggal: day("2026-10-10") },
      ],
    });
    expect(p.followUps.map((f) => f.id)).toEqual(["s1"]);
    expect(p.followUps[0]).toMatchObject({ kind: "order-waiting", dueLabel: "overdue", overdueDays: 3 });
    expect(p.newOrdersYesterday).toBe(1);
  });

  it("orders overdue first (most overdue first) and caps the list at 6 but keeps the total", () => {
    const invoices = Array.from({ length: 8 }, (_, i) => ({
      id: `i${i}`, invNumber: `INV-${i}`, customerName: "PT", dueDate: day(`2026-10-0${i + 1}`), grandTotal: 10, paidTotal: 0, status: "sent",
    }));
    const p = buildPersonalSummary({ ...base, invoices });
    expect(p.followUps).toHaveLength(6);
    expect(p.followUpTotal).toBe(8);
    expect(p.followUps[0]!.id).toBe("i0");
    expect(p.followUps[0]!.overdueDays).toBeGreaterThan(p.followUps[5]!.overdueDays);
  });
});
