import type {
  DashboardCashflowProjectionPayload,
  DashboardRevenueTrendPoint,
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

export function buildRevenueScale(series: DashboardRevenueTrendPoint[]): {
  maxValue: number;
  rows: Array<DashboardRevenueTrendPoint & { bookedPct: number; potentialPct: number }>;
} {
  const maxValue = Math.max(
    1,
    ...series.map((point) => Math.max(point.bookedRevenue, point.potentialRevenue))
  );
  return {
    maxValue,
    rows: series.map((point) => ({
      ...point,
      bookedPct: (point.bookedRevenue / maxValue) * 100,
      potentialPct: (point.potentialRevenue / maxValue) * 100,
    })),
  };
}

export function buildCashflowAssumptionNote(
  payload: DashboardCashflowProjectionPayload
): string {
  return `Assumption: ${payload.assumptions.termRuleUsed}. ${payload.assumptions.confidenceNote}`;
}

