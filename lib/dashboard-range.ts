import type { DashboardRange } from "@/lib/dashboard-contract";

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

export function getDashboardRangeStart(range: DashboardRange, now: Date): Date | null {
  if (range === "mtd") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  if (range === "ytd") {
    return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  }
  if (range === "12m") {
    return addUtcMonths(startOfUtcMonth(now), -11);
  }
  return null;
}
