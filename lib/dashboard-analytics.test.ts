import { buildDashboardAnalyticsPayload } from "@/lib/dashboard-analytics";

const baseProject = {
  id: "p1",
  name: "Project 1",
  status: "draft",
  qty: 1,
  totalHPP: 1000,
  totalSelling: 1400,
  overhead: 5,
  contingency: 3,
  eskalasi: 0,
  asuransi: 0,
  mobilisasi: 0,
  margin: 20,
  priceAdjustmentPct: 0,
  priceAdjustmentAmt: 0,
  updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  segments: [],
};

const baseQuotation = {
  id: "q1",
  status: "approved",
  salesman: null,
  tanggal: new Date("2026-05-02T00:00:00.000Z"),
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  updatedAt: new Date("2026-05-02T00:00:00.000Z"),
  projectId: "p1",
  clientName: "Budi",
  clientCompany: "PT Alpha",
  validityDays: 14,
  discount: 100,
  discountEnabled: true,
  totalBeforeDisc: 1500,
  totalAfterDisc: 1400,
  totalPPN: 154,
  totalPPH: 0,
  grandTotal: 1554,
  paymentTerms: "DP 50%, balance CBD",
  project: {
    id: "p1",
    name: "Project 1",
    totalHPP: 1000,
    totalSelling: 1400,
  },
};

describe("buildDashboardAnalyticsPayload", () => {
  it("returns safe empty response for no data", () => {
    const payload = buildDashboardAnalyticsPayload(
      { projects: [], quotations: [], defaultPaymentTerms: "DP 50%, balance CBD" },
      new Date("2026-05-09T00:00:00.000Z")
    );

    expect(payload.kpis.totalProjects).toBe(0);
    expect(payload.sankey.nodes).toHaveLength(0);
    expect(payload.revenueTrend.series).toHaveLength(0);
    expect(payload.quotationFunnel.totalCount).toBe(0);
  });

  it("builds phase-1 dashboard payload with explicit payment terms", () => {
    const payload = buildDashboardAnalyticsPayload(
      {
        projects: [baseProject],
        quotations: [baseQuotation],
        defaultPaymentTerms: "DP 50%, balance CBD",
      },
      new Date("2026-05-09T00:00:00.000Z")
    );

    expect(payload.kpis.totalProjects).toBe(1);
    expect(payload.projectScope.options).toHaveLength(1);
    expect(payload.kpis.approvedQuotation).toBe(1);
    expect(payload.sankey.nodes.length).toBeGreaterThan(0);
    expect(payload.sankey.links.length).toBeGreaterThan(0);
    expect(payload.revenueTrend.period).toBe("monthly");
    expect(payload.cashflowProjection.series).toHaveLength(12);
    expect(payload.cashflowProjection.assumptions.confidenceNote).toContain("parsed");
    expect(payload.kpis.backlogValue).toBe(1400);
    expect(payload.kpis.pipelineValue).toBe(0);
    expect(payload.kpis.taxExposurePpn).toBe(154);
    expect(payload.quotationFunnel.approvedCount).toBe(1);
    expect(payload.quotationFunnel.bookedCount).toBe(1);
    expect(payload.quotationFunnel.winRatePct).toBe(100);
    expect(payload.statusDistribution.quotationStatus[0]?.status).toBe("approved");
    expect(payload.quotationAging.rows).toHaveLength(1);
    expect(payload.discountMarginTrend.series).toHaveLength(12);
    expect(payload.salesLeaderboard.mode).toBe("client");
    expect(payload.salesLeaderboard.rows[0]?.principal).toBe("PT Alpha");
  });

  it("filters analytics by selected project", () => {
    const payload = buildDashboardAnalyticsPayload(
      {
        projects: [
          baseProject,
          {
            ...baseProject,
            id: "p2",
            name: "Project 2",
            totalHPP: 2000,
            totalSelling: 2800,
            segments: [],
          },
        ],
        quotations: [
          baseQuotation,
          {
            ...baseQuotation,
            id: "q2",
            projectId: "p2",
            project: {
              id: "p2",
              name: "Project 2",
              totalHPP: 2000,
              totalSelling: 2800,
            },
          },
        ],
        defaultPaymentTerms: "DP 50%, balance CBD",
        selectedProjectId: "p1",
      },
      new Date("2026-05-09T00:00:00.000Z")
    );

    expect(payload.projectScope.selectedProjectId).toBe("p1");
    expect(payload.projectScope.options).toHaveLength(1);
    expect(payload.projectScope.options[0]?.id).toBe("p1");
    expect(payload.kpis.totalProjects).toBe(1);
  });

  it("returns empty scoped payload for unknown project id", () => {
    const payload = buildDashboardAnalyticsPayload(
      {
        projects: [baseProject],
        quotations: [baseQuotation],
        defaultPaymentTerms: "DP 50%, balance CBD",
        selectedProjectId: "missing",
      },
      new Date("2026-05-09T00:00:00.000Z")
    );

    expect(payload.projectScope.selectedProjectId).toBe("missing");
    expect(payload.projectScope.options).toHaveLength(0);
    expect(payload.kpis.totalProjects).toBe(0);
  });

  it("uses deterministic fallback when payment terms unknown", () => {
    const payload = buildDashboardAnalyticsPayload(
      {
        projects: [baseProject],
        quotations: [{ ...baseQuotation, paymentTerms: "unknown term text" }],
        defaultPaymentTerms: "not parseable",
      },
      new Date("2026-05-09T00:00:00.000Z")
    );

    expect(payload.cashflowProjection.assumptions.confidenceNote).toContain("deterministic 50/50 fallback");
    const mayBucket = payload.cashflowProjection.series.find((row) => row.month === "2026-05");
    const junBucket = payload.cashflowProjection.series.find((row) => row.month === "2026-06");
    expect(mayBucket?.projectedIn).toBeGreaterThan(0);
    expect(junBucket?.projectedIn).toBeGreaterThan(0);
  });

  it("applies range filter for pipeline and funnel", () => {
    const payload = buildDashboardAnalyticsPayload(
      {
        projects: [baseProject],
        quotations: [
          { ...baseQuotation, id: "q-old", status: "draft", tanggal: new Date("2025-02-02T00:00:00.000Z") },
          { ...baseQuotation, id: "q-new", status: "draft", tanggal: new Date("2026-05-02T00:00:00.000Z") },
        ],
        defaultPaymentTerms: "DP 50%, balance CBD",
        range: "mtd",
      },
      new Date("2026-05-09T00:00:00.000Z")
    );

    expect(payload.range).toBe("mtd");
    expect(payload.kpis.pipelineValue).toBe(1400);
    expect(payload.quotationFunnel.draftCount).toBe(1);
  });

  it("counts expired quotations before row limit", () => {
    const payload = buildDashboardAnalyticsPayload(
      {
        projects: [baseProject],
        quotations: Array.from({ length: 15 }, (_, index) => ({
          ...baseQuotation,
          id: `q-${index}`,
          tanggal: new Date(`2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
          validityDays: 1,
        })),
        defaultPaymentTerms: "DP 50%, balance CBD",
      },
      new Date("2026-05-09T00:00:00.000Z")
    );

    expect(payload.quotationAging.rows).toHaveLength(12);
    expect(payload.quotationAging.expiredCount).toBe(15);
  });

  it("computes win rate as won/(won+lost), ignoring open drafts", () => {
    const payload = buildDashboardAnalyticsPayload(
      {
        projects: [baseProject],
        quotations: [
          { ...baseQuotation, id: "q1", status: "won" },
          { ...baseQuotation, id: "q2", status: "lost" },
          { ...baseQuotation, id: "q3", status: "draft" },
        ],
        defaultPaymentTerms: "DP 50%, balance CBD",
      },
      new Date("2026-05-09T00:00:00.000Z")
    );

    expect(payload.quotationFunnel.wonCount).toBe(1);
    expect(payload.quotationFunnel.lostCount).toBe(1);
    expect(payload.quotationFunnel.bookedCount).toBe(1);
    expect(payload.quotationFunnel.winRatePct).toBe(50);
  });

  it("uses salesman leaderboard when attribution is available", () => {
    const payload = buildDashboardAnalyticsPayload(
      {
        projects: [baseProject],
        quotations: [
          { ...baseQuotation, id: "q1", status: "approved", salesman: "Rina" },
          { ...baseQuotation, id: "q2", status: "draft", salesman: "Rina" },
          { ...baseQuotation, id: "q3", status: "approved", salesman: "Dimas" },
        ],
        defaultPaymentTerms: "DP 50%, balance CBD",
      },
      new Date("2026-05-09T00:00:00.000Z")
    );

    expect(payload.salesLeaderboard.mode).toBe("salesman");
    expect(payload.salesLeaderboard.rows[0]?.principal).toBe("Rina");
    expect(payload.salesLeaderboard.rows[0]?.quotationCount).toBe(2);
    expect(payload.salesLeaderboard.rows[0]?.pipelineValue).toBe(1400);
  });
});
