import {
  buildCashflowAssumptionNote,
  buildRevenueScale,
  buildSankeyBridgeSummary,
} from "@/lib/dashboard-ui-mappers";

describe("dashboard-ui-mappers", () => {
  it("derives gross/net/tax bridge summary from sankey links", () => {
    const summary = buildSankeyBridgeSummary({
      range: "allTime",
      nodes: [],
      links: [
        { source: "costStack", target: "sellingBeforeCommercial", value: 900 },
        { source: "margin", target: "sellingBeforeCommercial", value: 100 },
        { source: "sellingBeforeCommercial", target: "discountLeakage", value: 80 },
        { source: "sellingBeforeCommercial", target: "commercialNet", value: 920 },
        { source: "commercialNet", target: "taxIncludedRevenue", value: 920 },
        { source: "ppn", target: "taxIncludedRevenue", value: 101.2 },
        { source: "pph", target: "taxIncludedRevenue", value: 0 },
      ],
    });

    expect(summary.grossSellingBeforeCommercial).toBe(1000);
    expect(summary.discountLeakage).toBe(80);
    expect(summary.netCommercialRevenue).toBe(920);
    expect(summary.ppnTax).toBe(101.2);
    expect(summary.taxIncludedRevenue).toBe(1021.2);
  });

  it("builds chart scale percentages safely", () => {
    const scale = buildRevenueScale([
      { month: "2026-01", bookedRevenue: 0, potentialRevenue: 500 },
      { month: "2026-02", bookedRevenue: 1000, potentialRevenue: 200 },
    ]);

    expect(scale.maxValue).toBe(1000);
    expect(scale.rows[0]?.bookedPct).toBe(0);
    expect(scale.rows[0]?.potentialPct).toBe(50);
    expect(scale.rows[1]?.bookedPct).toBe(100);
  });

  it("renders clear assumption note text", () => {
    const note = buildCashflowAssumptionNote({
      series: [],
      assumptions: {
        termRuleUsed: "pattern-percent-parser + deterministic 50/50 fallback",
        confidenceNote: "Some payment terms were unrecognized and used deterministic fallback.",
      },
    });

    expect(note).toContain("Assumption:");
    expect(note).toContain("deterministic 50/50 fallback");
    expect(note).toContain("Some payment terms were unrecognized");
  });
});

