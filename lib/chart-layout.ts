import type { ContainerWidthTier } from "@/hooks/use-container-width";

/** Y-axis width tuned per container tier so labels do not steal chart area. */
export function chartYAxisWidth(tier: ContainerWidthTier): number {
  if (tier === "compact") return 52;
  if (tier === "cozy") return 68;
  return 92;
}

/** Bottom margin when X-axis labels are angled or multiline. */
export function chartBottomMargin(tier: ContainerWidthTier, angled: boolean): number {
  if (!angled) return 8;
  if (tier === "compact") return 4;
  if (tier === "cozy") return 56;
  return 32;
}

/** X-axis label rotation (degrees). 0 = horizontal. */
export function chartXAxisAngle(tier: ContainerWidthTier, categoryCount: number): number {
  if (tier === "wide" && categoryCount <= 6) return 0;
  if (tier === "compact") return 0;
  return -35;
}

/** Recharts interval: skip ticks when crowded. */
export function chartXAxisInterval(tier: ContainerWidthTier, categoryCount: number): number | "preserveStartEnd" {
  if (tier === "compact" && categoryCount > 6) return 1;
  return 0;
}

/** Shorter month key for crowded charts (expects YYYY-MM). */
export function formatMonthAxisLabel(month: string, tier: ContainerWidthTier): string {
  const match = month.match(/^(\d{4})-(\d{2})/);
  if (!match) return month;
  const [, year, monthNum] = match;
  if (tier === "compact") return monthNum ?? month;
  return `${monthNum}/${year?.slice(2) ?? ""}`;
}
