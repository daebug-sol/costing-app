import { cn } from "@/lib/utils";

/** Toolbar filter strip — flat L2 on page canvas. */
export const dashboardToolbarPanelClass =
  "border border-border bg-surface-nested shadow-sm";

/** Sticky bar — opaque card, no tinted gradient wash. */
export const dashboardStickyToolbarShellClass =
  "border-b border-border bg-card/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:backdrop-blur-lg";

/** L1 — main dashboard segments (Insight utama, Detail accordion). */
export const dashboardSegmentClass =
  "rounded-none border border-border bg-card shadow-sm";

/** L2 — tab pane / grouped sub-area inside a segment. */
export const dashboardSubsegmentClass =
  "rounded-none border border-border/80 bg-surface-nested p-3 sm:p-4";

/** Tab-specific tint — subtle nested surface only (no saturated borders). */
export const dashboardTabPaneClass = {
  finansial: "bg-surface-inset/80 border-border/60",
  penjualan: "bg-surface-inset/80 border-border/60",
  costing: "bg-surface-inset/80 border-border/60",
} as const;

export type DashboardInsightAccent =
  | "bridge"
  | "cashflow"
  | "cost"
  | "revenue"
  | "funnel"
  | "status"
  | "leaderboard"
  | "aging";

const insightStripeClass: Record<DashboardInsightAccent, string> = {
  bridge: "bg-chart-2",
  cashflow: "bg-chart-3",
  cost: "bg-chart-4",
  revenue: "bg-chart-5",
  funnel: "bg-chart-1",
  status: "bg-primary",
  leaderboard: "bg-chart-2",
  aging: "bg-warning",
};

/** Insight cards: neutral surface; accent = 4px stripe only. */
const insightAccentStyles: Record<
  DashboardInsightAccent,
  { surface: string; stripe: string; header: string }
> = Object.fromEntries(
  (Object.keys(insightStripeClass) as DashboardInsightAccent[]).map((key) => [
    key,
    {
      surface: "border-border bg-card shadow-sm",
      stripe: insightStripeClass[key],
      header: "text-foreground",
    },
  ])
) as Record<DashboardInsightAccent, { surface: string; stripe: string; header: string }>;

export function insightAccentClass(accent: DashboardInsightAccent, part: "surface" | "stripe" | "header") {
  return insightAccentStyles[accent][part];
}

export type DashboardKpiAccent = "revenue" | "margin" | "pipeline" | "leakage" | "neutral";

const kpiStripeClass: Record<Exclude<DashboardKpiAccent, "neutral">, string> = {
  revenue: "border-chart-2/50",
  margin: "border-success/40",
  pipeline: "border-chart-3/50",
  leakage: "border-warning/45",
};

const kpiAccentStyles: Record<DashboardKpiAccent, string> = {
  revenue: `border bg-card shadow-sm ${kpiStripeClass.revenue}`,
  margin: `border bg-card shadow-sm ${kpiStripeClass.margin}`,
  pipeline: `border bg-card shadow-sm ${kpiStripeClass.pipeline}`,
  leakage: `border bg-card shadow-sm ${kpiStripeClass.leakage}`,
  neutral: "border-border bg-card shadow-sm",
};

export function kpiAccentClass(accent: DashboardKpiAccent) {
  return kpiAccentStyles[accent];
}

const secondaryTileTints = [
  "border-border bg-card",
  "border-border/90 bg-surface-nested",
  "border-border/90 bg-surface-nested",
  "border-border/90 bg-surface-nested",
] as const;

export function secondaryKpiTintClass(index: number) {
  return secondaryTileTints[index % secondaryTileTints.length];
}

/** L3 wrapper inside accordion detail — dashed inset boundary. */
export function dashboardDetailInnerClass(className?: string) {
  return cn(
    "rounded-none border border-dashed border-border/90 bg-surface-inset/60 p-3 sm:p-4",
    className
  );
}
