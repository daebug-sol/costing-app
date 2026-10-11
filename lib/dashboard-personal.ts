/** Pure helpers behind the personal dashboard home (target, pace, follow-ups). */

import { isBookedQuotationStatus, isPotentialQuotationStatus } from "@/lib/dashboard-status";

/** null clears the target; a finite number >= 0 sets it; anything else is invalid. */
export function parseMonthlyTarget(input: unknown): number | null | "invalid" {
  if (input === null) return null;
  if (typeof input === "number" && Number.isFinite(input) && input >= 0) return input;
  return "invalid";
}


export type FollowUp = {
  id: string;
  kind: "quotation-expiring" | "invoice-overdue" | "order-waiting";
  /** Document number, e.g. "INV-0412". */
  ref: string;
  /** Client or company the item is about. */
  party: string;
  dueLabel: "today" | "tomorrow" | "overdue";
  overdueDays: number;
};

export type DashboardPersonal = {
  monthlyTarget: number | null;
  bookedThisMonth: number;
  /** null without a target; never negative. */
  remaining: number | null;
  /** null without a target; may exceed 100. */
  progressPct: number | null;
  /** Share of the month already elapsed (0-100): where "on pace" would be. */
  idealPct: number;
  /** Booked minus the on-pace amount; null without a target. */
  paceDeltaValue: number | null;
  bestMonth: { month: string; booked: number } | null;
  daysLeftInMonth: number;
  newOrdersYesterday: number;
  expiringQuotationCount: number;
  followUpTotal: number;
  followUps: FollowUp[];
};

export type PersonalInput = {
  now: Date;
  monthlyTarget: number | null;
  /** Booked revenue per "YYYY-MM" month. */
  revenueSeries: ReadonlyArray<{ month: string; bookedRevenue: number }>;
  quotations: ReadonlyArray<{
    id: string;
    ref: string;
    status: string | null;
    tanggal: Date;
    validityDays: number | null;
    clientLabel: string;
  }>;
  invoices: ReadonlyArray<{
    id: string;
    invNumber: string | null;
    customerName: string;
    dueDate: Date | null;
    grandTotal: number;
    paidTotal: number;
    status: string | null;
  }>;
  salesOrders: ReadonlyArray<{
    id: string;
    soNumber: string | null;
    clientLabel: string;
    status: string | null;
    tanggal: Date;
  }>;
};

const DAY_MS = 86_400_000;
const MAX_FOLLOW_UPS = 6;
const ORDER_WAIT_DAYS = 7;

const utcDay = (d: Date) => Math.floor(d.getTime() / DAY_MS);
const monthOf = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const lower = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

function dueLabelFor(daysFromToday: number): FollowUp["dueLabel"] | null {
  if (daysFromToday < 0) return "overdue";
  if (daysFromToday === 0) return "today";
  if (daysFromToday === 1) return "tomorrow";
  return null;
}

export function buildPersonalSummary(input: PersonalInput): DashboardPersonal {
  const { now } = input;
  const today = utcDay(now);
  const dayOfMonth = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const idealPct = (dayOfMonth / daysInMonth) * 100;
  const target = input.monthlyTarget && input.monthlyTarget > 0 ? input.monthlyTarget : null;

  const thisMonth = monthOf(now);
  const bookedThisMonth = input.revenueSeries.find((s) => s.month === thisMonth)?.bookedRevenue ?? 0;
  let bestMonth: DashboardPersonal["bestMonth"] = null;
  for (const s of input.revenueSeries) {
    if (s.bookedRevenue > 0 && (!bestMonth || s.bookedRevenue > bestMonth.booked)) {
      bestMonth = { month: s.month, booked: s.bookedRevenue };
    }
  }

  const items: FollowUp[] = [];

  for (const q of input.quotations) {
    if (isBookedQuotationStatus(q.status) || !isPotentialQuotationStatus(q.status)) continue;
    if (!q.validityDays || q.validityDays <= 0) continue;
    const label = dueLabelFor(utcDay(q.tanggal) + q.validityDays - today);
    if (label === "today" || label === "tomorrow") {
      items.push({ id: q.id, kind: "quotation-expiring", ref: q.ref, party: q.clientLabel, dueLabel: label, overdueDays: 0 });
    }
  }

  for (const inv of input.invoices) {
    if (!inv.dueDate || ["void", "draft", "paid"].includes(lower(inv.status))) continue;
    if (inv.grandTotal - inv.paidTotal <= 0) continue;
    const delta = utcDay(inv.dueDate) - today;
    const label = dueLabelFor(delta);
    if (label) {
      items.push({
        id: inv.id,
        kind: "invoice-overdue",
        ref: inv.invNumber ?? "",
        party: inv.customerName,
        dueLabel: label,
        overdueDays: delta < 0 ? -delta : 0,
      });
    }
  }

  for (const so of input.salesOrders) {
    if (lower(so.status) !== "open") continue;
    const age = today - utcDay(so.tanggal);
    if (age > ORDER_WAIT_DAYS) {
      items.push({
        id: so.id,
        kind: "order-waiting",
        ref: so.soNumber ?? "",
        party: so.clientLabel,
        dueLabel: "overdue",
        overdueDays: age - ORDER_WAIT_DAYS,
      });
    }
  }

  const rank = { overdue: 0, today: 1, tomorrow: 2 } as const;
  items.sort((a, b) => rank[a.dueLabel] - rank[b.dueLabel] || b.overdueDays - a.overdueDays);

  return {
    monthlyTarget: target,
    bookedThisMonth,
    remaining: target === null ? null : Math.max(0, target - bookedThisMonth),
    progressPct: target === null ? null : (bookedThisMonth / target) * 100,
    idealPct,
    paceDeltaValue: target === null ? null : bookedThisMonth - (target * idealPct) / 100,
    bestMonth,
    daysLeftInMonth: daysInMonth - dayOfMonth,
    newOrdersYesterday: input.salesOrders.filter((so) => utcDay(so.tanggal) === today - 1).length,
    expiringQuotationCount: items.filter((i) => i.kind === "quotation-expiring").length,
    followUpTotal: items.length,
    followUps: items.slice(0, MAX_FOLLOW_UPS),
  };
}
