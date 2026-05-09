export type DashboardKpis = {
  totalProjects: number;
  activeCosting: number;
  pendingQuotation: number;
  approvedQuotation: number;
  weightedGrossMarginPct: number;
  discountLeakageValue: number;
  bookedRevenueMtd: number;
  bookedRevenueYtd: number;
};

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

export type DashboardApiResponse = {
  projectScope: DashboardProjectScope;
  kpis: DashboardKpis;
  costingData: DashboardCostingData;
  sankey: DashboardSankeyPayload;
  revenueTrend: DashboardRevenueTrendPayload;
  cashflowProjection: DashboardCashflowProjectionPayload;
  topDrivers: DashboardTopDrivers;
};

export const EMPTY_DASHBOARD_RESPONSE: DashboardApiResponse = {
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
};
