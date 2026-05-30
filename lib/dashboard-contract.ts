export type DashboardKpis = {
  totalProjects: number;
  activeCosting: number;
  pendingQuotation: number;
  approvedQuotation: number;
  weightedGrossMarginPct: number;
  discountLeakageValue: number;
  bookedRevenueMtd: number;
  bookedRevenueYtd: number;
  pipelineValue: number;
  backlogValue: number;
  winRatePct: number;
  taxExposurePpn: number;
  taxExposurePph: number;
};

export type DashboardRange = "mtd" | "ytd" | "12m" | "all";

export type DashboardSankeyNode = {
  id: string;
  label: string;
  group: "cost" | "pricing" | "commercial" | "tax" | "result";
};

export type DashboardSankeyLink = {
  source: string;
  target: string;
  value: number;
  meta?: Record<string, string | number | boolean | null>;
};

export type DashboardSankeyPayload = {
  range: "last30d" | "allTime";
  nodes: DashboardSankeyNode[];
  links: DashboardSankeyLink[];
};

export type DashboardRevenueTrendPoint = {
  month: string;
  bookedRevenue: number;
  potentialRevenue: number;
};

export type DashboardRevenueTrendPayload = {
  period: "monthly";
  series: DashboardRevenueTrendPoint[];
};

export type DashboardCashflowPoint = {
  month: string;
  projectedIn: number;
  projectedOut: number;
  projectedNet: number;
};

export type DashboardCashflowAssumptions = {
  termRuleUsed: string;
  confidenceNote: string;
};

export type DashboardCashflowProjectionPayload = {
  series: DashboardCashflowPoint[];
  assumptions: DashboardCashflowAssumptions;
};

export type DashboardGrossProfitDriver = {
  projectId: string;
  projectName: string;
  grossProfit: number;
  grossMarginPct: number;
  sellingValue: number;
  hppValue: number;
};

export type DashboardMarginErosionDriver = {
  projectId: string;
  projectName: string;
  expectedSelling: number;
  quotedNetRevenue: number;
  erosionValue: number;
  erosionPct: number;
};

export type DashboardTopDrivers = {
  topGrossProfitProjects: DashboardGrossProfitDriver[];
  topMarginErosionProjects: DashboardMarginErosionDriver[];
};

export type DashboardRawCostContribution = {
  rawCategory: string;
  subAssembly: string;
  value: number;
};

export type DashboardCostingData = {
  rawContributions: DashboardRawCostContribution[];
  hpp: number;
  overhead: number;
  contingency: number;
  eskalasi: number;
  asuransi: number;
  mobilisasi: number;
  margin: number;
  grossTotal: number;
  discount: number;
  netSelling: number;
  ppn: number;
  pph: number;
  grandTotal: number;
};

export type DashboardProjectScopeOption = {
  id: string;
  name: string;
};

export type DashboardProjectScope = {
  selectedProjectId: string | null;
  options: DashboardProjectScopeOption[];
};

export type DashboardQuotationFunnel = {
  draftCount: number;
  finalCount: number;
  approvedCount: number;
  totalCount: number;
  winRatePct: number;
};

export type DashboardStatusDistributionRow = {
  status: string;
  count: number;
  value: number;
};

export type DashboardStatusDistribution = {
  projectStatus: DashboardStatusDistributionRow[];
  quotationStatus: DashboardStatusDistributionRow[];
};

export type DashboardQuotationAgingRow = {
  quotationId: string;
  status: string;
  tanggal: string;
  ageDays: number;
  validityDays: number;
  expiryDate: string;
  isExpired: boolean;
  clientLabel: string;
  discountValue: number;
  totalAfterDisc: number;
};

export type DashboardQuotationAging = {
  rows: DashboardQuotationAgingRow[];
  expiredCount: number;
  generatedAt: string;
};

export type DashboardDiscountMarginTrendPoint = {
  month: string;
  discountLeakage: number;
  bookedRevenue: number;
  weightedMarginPct: number;
};

export type DashboardDiscountMarginTrend = {
  period: "monthly";
  series: DashboardDiscountMarginTrendPoint[];
};

export type DashboardSegmentMixRow = {
  segmentType: "ahu" | "manual" | "other";
  value: number;
  pct: number;
};

export type DashboardSegmentMix = {
  rows: DashboardSegmentMixRow[];
};

export type DashboardTopClientRow = {
  client: string;
  bookedRevenue: number;
  quotationCount: number;
  concentrationPct: number;
};

export type DashboardTopClient = {
  rows: DashboardTopClientRow[];
};

export type DashboardSalesLeaderboardMode = "salesman" | "client";

export type DashboardSalesLeaderboardRow = {
  principal: string;
  bookedRevenue: number;
  quotationCount: number;
  winRatePct: number;
  avgMarginPct: number;
  pipelineValue: number;
};

export type DashboardSalesLeaderboard = {
  mode: DashboardSalesLeaderboardMode;
  rows: DashboardSalesLeaderboardRow[];
};

export type DashboardApiResponse = {
  range: DashboardRange;
  projectScope: DashboardProjectScope;
  kpis: DashboardKpis;
  costingData: DashboardCostingData;
  sankey: DashboardSankeyPayload;
  revenueTrend: DashboardRevenueTrendPayload;
  cashflowProjection: DashboardCashflowProjectionPayload;
  topDrivers: DashboardTopDrivers;
  quotationFunnel: DashboardQuotationFunnel;
  statusDistribution: DashboardStatusDistribution;
  quotationAging: DashboardQuotationAging;
  discountMarginTrend: DashboardDiscountMarginTrend;
  segmentMix: DashboardSegmentMix;
  topClient: DashboardTopClient;
  salesLeaderboard: DashboardSalesLeaderboard;
};

export const EMPTY_DASHBOARD_RESPONSE: DashboardApiResponse = {
  range: "all",
  projectScope: {
    selectedProjectId: null,
    options: [],
  },
  kpis: {
    totalProjects: 0,
    activeCosting: 0,
    pendingQuotation: 0,
    approvedQuotation: 0,
    weightedGrossMarginPct: 0,
    discountLeakageValue: 0,
    bookedRevenueMtd: 0,
    bookedRevenueYtd: 0,
    pipelineValue: 0,
    backlogValue: 0,
    winRatePct: 0,
    taxExposurePpn: 0,
    taxExposurePph: 0,
  },
  costingData: {
    rawContributions: [],
    hpp: 0,
    overhead: 0,
    contingency: 0,
    eskalasi: 0,
    asuransi: 0,
    mobilisasi: 0,
    margin: 0,
    grossTotal: 0,
    discount: 0,
    netSelling: 0,
    ppn: 0,
    pph: 0,
    grandTotal: 0,
  },
  sankey: {
    range: "allTime",
    nodes: [],
    links: [],
  },
  revenueTrend: {
    period: "monthly",
    series: [],
  },
  cashflowProjection: {
    series: [],
    assumptions: {
      termRuleUsed: "fallback-50-50",
      confidenceNote: "No quotation data available.",
    },
  },
  topDrivers: {
    topGrossProfitProjects: [],
    topMarginErosionProjects: [],
  },
  quotationFunnel: {
    draftCount: 0,
    finalCount: 0,
    approvedCount: 0,
    totalCount: 0,
    winRatePct: 0,
  },
  statusDistribution: {
    projectStatus: [],
    quotationStatus: [],
  },
  quotationAging: {
    rows: [],
    expiredCount: 0,
    generatedAt: new Date(0).toISOString(),
  },
  discountMarginTrend: {
    period: "monthly",
    series: [],
  },
  segmentMix: {
    rows: [],
  },
  topClient: {
    rows: [],
  },
  salesLeaderboard: {
    mode: "client",
    rows: [],
  },
};
