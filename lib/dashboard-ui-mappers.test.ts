import {
  buildAgingSummary,
  buildCashflowAssumptionNote,
  buildCashflowTimelineScale,
  buildCostBreakdownRows,
  buildProfitBridgeStages,
  buildRevenueScale,
  buildSankeyBridgeSummary,
  buildTrendDelta,
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

  it("builds profit bridge stages from sankey summary", () => {
    const payload = {
      range: "allTime" as const,
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
    };
    const summary = buildSankeyBridgeSummary(payload);
    const stages = buildProfitBridgeStages(payload, summary);

    expect(stages).toHaveLength(8);
    expect(stages[0]?.label).toBe("Total Cost");
    expect(stages.at(-1)?.value).toBe(1021.2);
  });

  it("collapses cost breakdown tail into Other", () => {
    const breakdown = buildCostBreakdownRows(
      [
        { rawCategory: "Steel", subAssembly: "Frame", value: 700 },
        { rawCategory: "Copper", subAssembly: "Coil", value: 200 },
        { rawCategory: "Misc", subAssembly: "Panel", value: 50 },
        { rawCategory: "Seal", subAssembly: "Panel", value: 50 },
      ],
      "subAssembly",
      { topN: 2, minPct: 10 }
    );

    expect(breakdown.total).toBe(1000);
    expect(breakdown.rows.some((row) => row.label === "Other")).toBe(true);
  });

  it("builds cashflow timeline with running balance", () => {
    const scale = buildCashflowTimelineScale([
      { month: "2026-01", projectedIn: 1000, projectedOut: 400, projectedNet: 600 },
      { month: "2026-02", projectedIn: 500, projectedOut: 800, projectedNet: -300 },
    ]);

    expect(scale.rows[0]?.runningBalance).toBe(600);
    expect(scale.rows[1]?.runningBalance).toBe(300);
    expect(scale.rows[1]?.isNegativeNet).toBe(true);
  });

  it("derives month-over-month trend delta", () => {
    const delta = buildTrendDelta(
      [
        { month: "2026-01", discountLeakage: 100, bookedRevenue: 300, weightedMarginPct: 20 },
        { month: "2026-02", discountLeakage: 120, bookedRevenue: 330, weightedMarginPct: 22 },
      ],
      "bookedRevenue"
    );

    expect(delta).toBeCloseTo(10, 5);
  });

  it("builds aging summary from quotation rows", () => {
    const summary = buildAgingSummary({
      expiredCount: 1,
      generatedAt: new Date("2026-05-09T00:00:00.000Z").toISOString(),
      rows: [
        {
          quotationId: "q1",
          status: "draft",
          tanggal: new Date("2026-05-01T00:00:00.000Z").toISOString(),
          ageDays: 10,
          validityDays: 14,
          expiryDate: new Date("2026-05-15T00:00:00.000Z").toISOString(),
          isExpired: false,
          clientLabel: "A",
          discountValue: 20,
          totalAfterDisc: 1000,
        },
        {
          quotationId: "q2",
          status: "approved",
          tanggal: new Date("2026-04-01T00:00:00.000Z").toISOString(),
          ageDays: 20,
          validityDays: 14,
          expiryDate: new Date("2026-04-15T00:00:00.000Z").toISOString(),
          isExpired: true,
          clientLabel: "B",
          discountValue: 0,
          totalAfterDisc: 2000,
        },
      ],
    });

    expect(summary.expiredCount).toBe(1);
    expect(summary.avgAgeDays).toBe(15);
  });
});

