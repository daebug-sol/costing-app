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
  updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  segments: [],
};

const baseQuotation = {
  id: "q1",
  status: "approved",
  tanggal: new Date("2026-05-02T00:00:00.000Z"),
  projectId: "p1",
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
    expect(payload.topDrivers.topGrossProfitProjects).toHaveLength(0);
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
    expect(payload.topDrivers.topGrossProfitProjects[0]?.projectId).toBe("p1");
    expect(payload.cashflowProjection.assumptions.confidenceNote).toContain("parsed");
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
    expect(payload.kpis.totalProjects).toBe(1);
    expect(payload.topDrivers.topGrossProfitProjects[0]?.projectId).toBe("p1");
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
});
