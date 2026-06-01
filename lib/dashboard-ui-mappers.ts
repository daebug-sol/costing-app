import type {
  DashboardCashflowPoint,
  DashboardCashflowProjectionPayload,
  DashboardDiscountMarginTrendPoint,
  DashboardRawCostContribution,
  DashboardSankeyPayload,
} from "@/lib/dashboard-contract";

export type SankeyBridgeSummary = {
  grossSellingBeforeCommercial: number;
  discountLeakage: number;
  netCommercialRevenue: number;
  ppnTax: number;
  pphTax: number;
  taxIncludedRevenue: number;
};

export function sumSankeyLinkValue(
  payload: DashboardSankeyPayload,
  source: string,
  target: string
): number {
  return payload.links.reduce((sum, link) => {
    if (link.source === source && link.target === target) {
      return sum + link.value;
    }
    return sum;
  }, 0);
}

export function buildSankeyBridgeSummary(payload: DashboardSankeyPayload): SankeyBridgeSummary {
  return {
    grossSellingBeforeCommercial: sumSankeyLinkValue(
      payload,
      "costStack",
      "sellingBeforeCommercial"
    ) + sumSankeyLinkValue(payload, "margin", "sellingBeforeCommercial"),
    discountLeakage: sumSankeyLinkValue(payload, "sellingBeforeCommercial", "discountLeakage"),
    netCommercialRevenue: sumSankeyLinkValue(payload, "sellingBeforeCommercial", "commercialNet"),
    ppnTax: sumSankeyLinkValue(payload, "ppn", "taxIncludedRevenue"),
    pphTax: sumSankeyLinkValue(payload, "pph", "taxIncludedRevenue"),
    taxIncludedRevenue: sumSankeyLinkValue(payload, "commercialNet", "taxIncludedRevenue")
      + sumSankeyLinkValue(payload, "ppn", "taxIncludedRevenue")
      + sumSankeyLinkValue(payload, "pph", "taxIncludedRevenue"),
  };
}

export function buildCashflowAssumptionNote(
  payload: DashboardCashflowProjectionPayload
): string {
  return `Assumption: ${payload.assumptions.termRuleUsed}. ${payload.assumptions.confidenceNote}`;
}

export type ProfitBridgeStageKind = "subtotal" | "positive" | "negative" | "final";

export type ProfitBridgeStage = {
  id: string;
  label: string;
  /** Short axis label for narrow / split-screen chart layouts. */
  shortLabel: string;
  value: number;
  delta: number | null;
  kind: ProfitBridgeStageKind;
  cumulative: number;
  pctOfGross: number;
};

export function buildProfitBridgeStages(
  payload: DashboardSankeyPayload,
  summary: SankeyBridgeSummary
): ProfitBridgeStage[] {
  const totalCost = sumSankeyLinkValue(payload, "costStack", "sellingBeforeCommercial");
  const margin = sumSankeyLinkValue(payload, "margin", "sellingBeforeCommercial");
  const gross = summary.grossSellingBeforeCommercial;
  const pctOfGross = (value: number) => (gross > 0 ? (value / gross) * 100 : 0);

  return [
    {
      id: "totalCost",
      label: "Total Cost",
      shortLabel: "Cost",
      value: totalCost,
      delta: null,
      kind: "subtotal",
      cumulative: totalCost,
      pctOfGross: pctOfGross(totalCost),
    },
    {
      id: "margin",
      label: "+ Margin",
      shortLabel: "Margin",
      value: margin,
      delta: margin,
      kind: "positive",
      cumulative: totalCost + margin,
      pctOfGross: pctOfGross(margin),
    },
    {
      id: "sellingBeforeCommercial",
      label: "Selling Before Commercial",
      shortLabel: "Selling",
      value: gross,
      delta: null,
      kind: "subtotal",
      cumulative: gross,
      pctOfGross: gross > 0 ? 100 : 0,
    },
    {
      id: "discount",
      label: "− Discount Leakage",
      shortLabel: "Discount",
      value: summary.discountLeakage,
      delta: -summary.discountLeakage,
      kind: "negative",
      cumulative: gross - summary.discountLeakage,
      pctOfGross: pctOfGross(summary.discountLeakage),
    },
    {
      id: "netCommercial",
      label: "Net Commercial",
      shortLabel: "Net",
      value: summary.netCommercialRevenue,
      delta: null,
      kind: "subtotal",
      cumulative: summary.netCommercialRevenue,
      pctOfGross: pctOfGross(summary.netCommercialRevenue),
    },
    {
      id: "ppn",
      label: "+ PPN",
      shortLabel: "PPN",
      value: summary.ppnTax,
      delta: summary.ppnTax,
      kind: "positive",
      cumulative: summary.netCommercialRevenue + summary.ppnTax,
      pctOfGross: pctOfGross(summary.ppnTax),
    },
    {
      id: "pph",
      label: "+ PPH",
      shortLabel: "PPH",
      value: summary.pphTax,
      delta: summary.pphTax,
      kind: "positive",
      cumulative: summary.netCommercialRevenue + summary.ppnTax + summary.pphTax,
      pctOfGross: pctOfGross(summary.pphTax),
    },
    {
      id: "taxIncluded",
      label: "Tax Included Revenue",
      shortLabel: "Tax incl.",
      value: summary.taxIncludedRevenue,
      delta: null,
      kind: "final",
      cumulative: summary.taxIncludedRevenue,
      pctOfGross: pctOfGross(summary.taxIncludedRevenue),
    },
  ];
}

export type CostBreakdownGroup = "subAssembly" | "rawCategory";

export type CostBreakdownRow = {
  key: string;
  label: string;
  value: number;
  pct: number;
  isOther?: boolean;
};

export function buildCostBreakdownRows(
  contributions: DashboardRawCostContribution[],
  groupBy: CostBreakdownGroup,
  options?: { topN?: number; minPct?: number }
): { total: number; rows: CostBreakdownRow[] } {
  const topN = options?.topN ?? 8;
  const minPct = options?.minPct ?? 3;
  const bucket = new Map<string, number>();

  for (const row of contributions) {
    const label =
      groupBy === "subAssembly"
        ? row.subAssembly.trim() || "Assembly"
        : row.rawCategory.trim() || "Uncategorized";
    const value = Number.isFinite(row.value) ? Math.max(0, row.value) : 0;
    if (value <= 0) continue;
    bucket.set(label, (bucket.get(label) ?? 0) + value);
  }

  const total = Array.from(bucket.values()).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return { total: 0, rows: [] };
  }

  const sorted = Array.from(bucket.entries())
    .map(([label, value]) => ({
      key: label,
      label,
      value,
      pct: (value / total) * 100,
    }))
    .sort((a, b) => b.value - a.value);

  const primary = sorted.filter((row) => row.pct >= minPct).slice(0, topN);
  const primaryKeys = new Set(primary.map((row) => row.key));
  const tail = sorted.filter((row) => !primaryKeys.has(row.key));
  const otherValue = tail.reduce((sum, row) => sum + row.value, 0);

  const rows: CostBreakdownRow[] = primary.map((row) => ({ ...row, isOther: false }));
  if (otherValue > 0) {
    rows.push({
      key: "__other__",
      label: "Other",
      value: otherValue,
      pct: (otherValue / total) * 100,
      isOther: true,
    });
  }

  return { total, rows };
}

export type CashflowTimelineRow = DashboardCashflowPoint & {
  runningBalance: number;
  inPct: number;
  outPct: number;
  netPct: number;
  isNegativeNet: boolean;
};

export function buildCashflowTimelineScale(series: DashboardCashflowPoint[]): {
  maxValue: number;
  rows: CashflowTimelineRow[];
} {
  let cumulative = 0;
  const runningBalances = series.map((point) => {
    cumulative += point.projectedNet;
    return cumulative;
  });

  const maxValue = Math.max(
    1,
    ...series.map((point) =>
      Math.max(
        Math.abs(point.projectedIn),
        Math.abs(point.projectedOut),
        Math.abs(point.projectedNet)
      )
    ),
    ...runningBalances.map((balance) => Math.abs(balance))
  );

  cumulative = 0;
  const scaledRows: CashflowTimelineRow[] = series.map((point) => {
    cumulative += point.projectedNet;
    return {
      ...point,
      runningBalance: cumulative,
      inPct: (Math.abs(point.projectedIn) / maxValue) * 100,
      outPct: (Math.abs(point.projectedOut) / maxValue) * 100,
      netPct: (Math.abs(point.projectedNet) / maxValue) * 100,
      isNegativeNet: point.projectedNet < 0,
    };
  });

  return { maxValue, rows: scaledRows };
}

export function buildTrendDelta(
  series: DashboardDiscountMarginTrendPoint[],
  key: "discountLeakage" | "bookedRevenue" | "weightedMarginPct"
): number {
  if (series.length < 2) return 0;
  const latest = series.at(-1)?.[key] ?? 0;
  const previous = series.at(-2)?.[key] ?? 0;
  if (Math.abs(previous) < 1e-6) {
    return latest > 0 ? 100 : 0;
  }
  return ((latest - previous) / Math.abs(previous)) * 100;
}

export function buildMtdBookedDelta(series: DashboardDiscountMarginTrendPoint[]): number {
  return buildTrendDelta(series, "bookedRevenue");
}

export function buildYtdBookedDelta(
  series: DashboardDiscountMarginTrendPoint[],
  bookedRevenueYtd: number
): number {
  const latestMonthBooked = series.at(-1)?.bookedRevenue ?? 0;
  const ytdBeforeLatestMonth = bookedRevenueYtd - latestMonthBooked;
  if (Math.abs(ytdBeforeLatestMonth) < 1e-6) {
    return latestMonthBooked > 0 ? 100 : 0;
  }
  return (latestMonthBooked / ytdBeforeLatestMonth) * 100;
}

