import type { DashboardApiResponse, DashboardCashflowAssumptions } from "@/lib/dashboard-contract";
import { EMPTY_DASHBOARD_RESPONSE } from "@/lib/dashboard-contract";
import { finite } from "@/lib/calculations";
import { computeCostSummary, marginTogglesFromProject } from "@/lib/cost-summary";

type DashboardProjectInput = {
  id: string;
  name: string;
  status: string;
  qty: number;
  totalHPP: number;
  totalSelling: number;
  overhead: number;
  contingency: number;
  eskalasi: number;
  asuransi: number;
  mobilisasi: number;
  margin: number;
  updatedAt: Date;
  segments: Array<{
    id: string;
    type: string;
    title: string;
    subtotal: number;
    sections: Array<{
      category: string;
      subtotal: number;
      lineItems: Array<{
        description: string;
        subtotal: number;
      }>;
    }>;
    manualGroups: Array<{
      name: string;
      subtotal: number;
      items: Array<{
        name: string;
        category: string;
        subtotal: number;
      }>;
    }>;
  }>;
};

type DashboardQuotationInput = {
  id: string;
  status: string;
  tanggal: Date;
  projectId: string | null;
  totalBeforeDisc: number;
  totalAfterDisc: number;
  totalPPN: number;
  totalPPH: number;
  grandTotal: number;
  paymentTerms: string | null;
  project: {
    id: string;
    name: string;
    totalHPP: number;
    totalSelling: number;
  } | null;
};

export type DashboardAnalyticsInput = {
  projects: DashboardProjectInput[];
  quotations: DashboardQuotationInput[];
  defaultPaymentTerms: string;
  selectedProjectId?: string | null;
};

type PaymentInstallment = {
  percent: number;
  monthOffset: number;
  basis: "explicit" | "fallback" | "default-fallback";
};

const BOOKED_QUOTATION_STATUSES = new Set(["approved", "final", "finalized"]);
const POTENTIAL_QUOTATION_STATUSES = new Set(["draft"]);
const EPSILON = 1e-6;

function roundMoney(value: number): number {
  const safe = finite(value, 0);
  return Math.round((safe + Number.EPSILON) * 100) / 100;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function diffUtcMonths(from: Date, to: Date): number {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

function normalizePercent(value: number): number {
  return Math.max(0, finite(value, 0));
}

function classifyRawCategory(input: string): string {
  const t = input.trim().toLowerCase();
  if (!t) return "Other Materials";
  if (/aluminium|aluminum|profile|frame|casing/.test(t)) return "Raw Aluminum";
  if (/copper|tube|coil|finned|fin/.test(t)) return "Copper Tube";
  if (/paint|coating|finish|powder/.test(t)) return "Finishing";
  if (/labour|labor|manpower|fabrication|welding|assembly/.test(t)) return "Labor";
  if (/steel|skid|plate|bracket/.test(t)) return "Steel Parts";
  if (/insulation|foam|glasswool|rockwool/.test(t)) return "Insulation";
  if (/fan|motor|damper|accessor|component|electrical/.test(t)) return "Accessories";
  return "Other Materials";
}

function normalizeSubAssembly(input: string, fallback: string): string {
  const v = input.trim();
  return v ? v : fallback;
}

function asBookedRevenueAmount(q: DashboardQuotationInput): number {
  const afterDisc = normalizePercent(q.totalAfterDisc);
  if (afterDisc > EPSILON) return afterDisc;
  return normalizePercent(q.grandTotal);
}

function parseInstallmentsFromTermText(rawTerms: string): PaymentInstallment[] {
  const cleaned = rawTerms.trim().toLowerCase();
  if (!cleaned) return [];

  const parts = cleaned.split(/[;,/]+/).map((part) => part.trim()).filter(Boolean);
  const result: PaymentInstallment[] = [];

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const pctMatch = part.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (!pctMatch) continue;
    const percent = Number(pctMatch[1].replace(",", "."));
    if (!Number.isFinite(percent) || percent <= 0) continue;

    let monthOffset = i;
    if (/(dp|down\s*payment|uang\s*muka)/i.test(part)) {
      monthOffset = 0;
    } else if (/(cbd|balance|before\s*delivery)/i.test(part)) {
      monthOffset = 1;
    } else {
      const daysMatch = part.match(/(\d+)\s*(hari|day|days)/i);
      if (daysMatch) {
        const days = Number(daysMatch[1]);
        monthOffset = Math.max(0, Math.ceil(days / 30));
      }
    }

    result.push({
      percent,
      monthOffset,
      basis: "explicit",
    });
  }

  return result;
}

function normalizedInstallments(rawInstallments: PaymentInstallment[]): PaymentInstallment[] {
  if (rawInstallments.length === 0) return [];
  const total = rawInstallments.reduce((sum, it) => sum + normalizePercent(it.percent), 0);
  if (total <= EPSILON) return [];
  return rawInstallments.map((it) => ({
    ...it,
    percent: (normalizePercent(it.percent) / total) * 100,
  }));
}

function deterministicFallbackInstallments(source: "fallback" | "default-fallback"): PaymentInstallment[] {
  return [
    { percent: 50, monthOffset: 0, basis: source },
    { percent: 50, monthOffset: 1, basis: source },
  ];
}

function resolveInstallments(paymentTerms: string | null, defaultTerms: string): PaymentInstallment[] {
  const explicit = normalizedInstallments(parseInstallmentsFromTermText(paymentTerms ?? ""));
  if (explicit.length > 0) return explicit;
  const fromDefault = normalizedInstallments(parseInstallmentsFromTermText(defaultTerms));
  if (fromDefault.length > 0) {
    return fromDefault.map((it) => ({ ...it, basis: "default-fallback" }));
  }
  return deterministicFallbackInstallments("fallback");
}

function kpiFromData(input: DashboardAnalyticsInput, now: Date) {
  const quotations = input.quotations;
  const projects = input.projects;

  const totalProjects = projects.length;
  const activeCosting = projects.filter((project) => project.status.toLowerCase() === "draft").length;
  const pendingQuotation = quotations.filter((quotation) =>
    POTENTIAL_QUOTATION_STATUSES.has(quotation.status.toLowerCase())
  ).length;
  const approvedQuotation = quotations.filter((quotation) =>
    BOOKED_QUOTATION_STATUSES.has(quotation.status.toLowerCase())
  ).length;

  const totalSelling = projects.reduce((sum, project) => sum + normalizePercent(project.totalSelling), 0);
  const totalGrossProfit = projects.reduce(
    (sum, project) => sum + (normalizePercent(project.totalSelling) - normalizePercent(project.totalHPP)),
    0
  );
  const weightedGrossMarginPct = totalSelling > EPSILON ? (totalGrossProfit / totalSelling) * 100 : 0;

  const discountLeakageValue = quotations
    .filter((quotation) => BOOKED_QUOTATION_STATUSES.has(quotation.status.toLowerCase()))
    .reduce(
      (sum, quotation) =>
        sum + Math.max(0, normalizePercent(quotation.totalBeforeDisc) - normalizePercent(quotation.totalAfterDisc)),
      0
    );

  const utcNow = now;
  const ytdStart = new Date(Date.UTC(utcNow.getUTCFullYear(), 0, 1));
  const mtdStart = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1));

  let bookedRevenueMtd = 0;
  let bookedRevenueYtd = 0;

  for (const quotation of quotations) {
    const status = quotation.status.toLowerCase();
    if (!BOOKED_QUOTATION_STATUSES.has(status)) continue;
    const amount = asBookedRevenueAmount(quotation);
    if (quotation.tanggal >= ytdStart && quotation.tanggal <= utcNow) {
      bookedRevenueYtd += amount;
    }
    if (quotation.tanggal >= mtdStart && quotation.tanggal <= utcNow) {
      bookedRevenueMtd += amount;
    }
  }

  return {
    totalProjects,
    activeCosting,
    pendingQuotation,
    approvedQuotation,
    weightedGrossMarginPct: roundMoney(weightedGrossMarginPct),
    discountLeakageValue: roundMoney(discountLeakageValue),
    bookedRevenueMtd: roundMoney(bookedRevenueMtd),
    bookedRevenueYtd: roundMoney(bookedRevenueYtd),
  };
}

function sankeyFromData(input: DashboardAnalyticsInput, now: Date): DashboardApiResponse["sankey"] {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentProjects = input.projects.filter((project) => project.updatedAt >= cutoff);
  const useRecentRange = recentProjects.length >= 3;
  const projectScope = recentProjects.length >= 3 ? recentProjects : input.projects;

  let hpp = 0;
  let oh = 0;
  let cont = 0;
  let esk = 0;
  let asu = 0;
  let mob = 0;
  let totalCost = 0;
  let marginAmt = 0;
  let sellingBeforeCommercial = 0;

  for (const project of projectScope) {
    const summary = computeCostSummary(
      project.totalHPP,
      project.qty,
      {
        overhead: project.overhead,
        contingency: project.contingency,
        eskalasi: project.eskalasi,
        asuransi: project.asuransi,
        mobilisasi: project.mobilisasi,
        margin: project.margin,
      },
      marginTogglesFromProject(project)
    );
    hpp += summary.hpp;
    oh += summary.oh;
    cont += summary.cont;
    esk += summary.esk;
    asu += summary.asu;
    mob += summary.mob;
    totalCost += summary.totalCost;
    marginAmt += summary.marginAmt;
    sellingBeforeCommercial += summary.selling;
  }

  const scopedProjectIds = new Set(projectScope.map((project) => project.id));
  const scopedQuotations = input.quotations.filter((quotation) => {
    if (useRecentRange && quotation.tanggal < cutoff) return false;
    if (scopedProjectIds.size === 0) return true;
    if (quotation.projectId === null) return true;
    return scopedProjectIds.has(quotation.projectId);
  });

  const discountAmount = scopedQuotations.reduce(
    (sum, quotation) =>
      sum + Math.max(0, normalizePercent(quotation.totalBeforeDisc) - normalizePercent(quotation.totalAfterDisc)),
    0
  );
  const ppnAmount = scopedQuotations.reduce((sum, quotation) => sum + normalizePercent(quotation.totalPPN), 0);
  const pphAmount = scopedQuotations.reduce((sum, quotation) => sum + normalizePercent(quotation.totalPPH), 0);
  const commercialNet = Math.max(0, sellingBeforeCommercial - discountAmount);

  return {
    range: useRecentRange ? "last30d" : "allTime",
    nodes: [
      { id: "cogs", label: "COGS", group: "cost" },
      { id: "overhead", label: "Overhead", group: "cost" },
      { id: "contingency", label: "Contingency", group: "cost" },
      { id: "eskalasi", label: "Eskalasi", group: "cost" },
      { id: "asuransi", label: "Asuransi", group: "cost" },
      { id: "mobilisasi", label: "Mobilisasi", group: "cost" },
      { id: "costStack", label: "Total Cost", group: "cost" },
      { id: "margin", label: "Margin", group: "pricing" },
      { id: "sellingBeforeCommercial", label: "Selling Before Commercial", group: "pricing" },
      { id: "discountLeakage", label: "Discount Leakage", group: "commercial" },
      { id: "commercialNet", label: "Net Commercial", group: "commercial" },
      { id: "ppn", label: "PPN", group: "tax" },
      { id: "pph", label: "PPH", group: "tax" },
      { id: "taxIncludedRevenue", label: "Tax Included Revenue", group: "result" },
    ],
    links: [
      { source: "cogs", target: "costStack", value: roundMoney(hpp) },
      { source: "overhead", target: "costStack", value: roundMoney(oh) },
      { source: "contingency", target: "costStack", value: roundMoney(cont) },
      { source: "eskalasi", target: "costStack", value: roundMoney(esk) },
      { source: "asuransi", target: "costStack", value: roundMoney(asu) },
      { source: "mobilisasi", target: "costStack", value: roundMoney(mob) },
      { source: "costStack", target: "sellingBeforeCommercial", value: roundMoney(totalCost) },
      { source: "margin", target: "sellingBeforeCommercial", value: roundMoney(marginAmt) },
      { source: "sellingBeforeCommercial", target: "discountLeakage", value: roundMoney(discountAmount) },
      { source: "sellingBeforeCommercial", target: "commercialNet", value: roundMoney(commercialNet) },
      { source: "commercialNet", target: "taxIncludedRevenue", value: roundMoney(commercialNet) },
      { source: "ppn", target: "taxIncludedRevenue", value: roundMoney(ppnAmount) },
      { source: "pph", target: "taxIncludedRevenue", value: roundMoney(pphAmount) },
    ].filter((link) => link.value > EPSILON),
  };
}

function costingDataFromData(input: DashboardAnalyticsInput): DashboardApiResponse["costingData"] {
  const rawBucket = new Map<string, number>();
  const addRaw = (rawCategory: string, subAssembly: string, value: number) => {
    const safeValue = normalizePercent(value);
    if (safeValue <= EPSILON) return;
    const key = `${rawCategory}|||${subAssembly}`;
    rawBucket.set(key, (rawBucket.get(key) ?? 0) + safeValue);
  };

  let hpp = 0;
  let overhead = 0;
  let contingency = 0;
  let eskalasi = 0;
  let asuransi = 0;
  let mobilisasi = 0;
  let margin = 0;
  let grossTotal = 0;

  for (const project of input.projects) {
    hpp += normalizePercent(project.totalHPP);
    const summary = computeCostSummary(
      project.totalHPP,
      project.qty,
      {
        overhead: project.overhead,
        contingency: project.contingency,
        eskalasi: project.eskalasi,
        asuransi: project.asuransi,
        mobilisasi: project.mobilisasi,
        margin: project.margin,
      },
      marginTogglesFromProject(project)
    );
    overhead += normalizePercent(summary.oh);
    contingency += normalizePercent(summary.cont);
    eskalasi += normalizePercent(summary.esk);
    asuransi += normalizePercent(summary.asu);
    mobilisasi += normalizePercent(summary.mob);
    margin += normalizePercent(summary.marginAmt);
    grossTotal += normalizePercent(summary.selling);

    for (const segment of project.segments) {
      if (segment.type === "ahu") {
        for (const section of segment.sections) {
          const subAssembly = normalizeSubAssembly(section.category, "AHU Assembly");
          if (section.lineItems.length > 0) {
            for (const line of section.lineItems) {
              addRaw(classifyRawCategory(line.description), subAssembly, line.subtotal);
            }
          } else {
            addRaw("Other Materials", subAssembly, section.subtotal);
          }
        }
      } else {
        for (const group of segment.manualGroups) {
          const subAssembly = normalizeSubAssembly(group.name, "Manual Assembly");
          if (group.items.length > 0) {
            for (const item of group.items) {
              addRaw(classifyRawCategory(`${item.category} ${item.name}`), subAssembly, item.subtotal);
            }
          } else {
            addRaw("Other Materials", subAssembly, group.subtotal);
          }
        }
      }
    }
  }

  const rawContributions = Array.from(rawBucket.entries())
    .map(([key, value]) => {
      const [rawCategory, subAssembly] = key.split("|||");
      return {
        rawCategory: rawCategory ?? "Other Materials",
        subAssembly: subAssembly ?? "Assembly",
        value: roundMoney(value),
      };
    })
    .filter((row) => row.value > EPSILON);

  const rawTotal = rawContributions.reduce((sum, row) => sum + row.value, 0);
  const rawDiff = roundMoney(hpp - rawTotal);
  if (Math.abs(rawDiff) > 0.01) {
    rawContributions.push({
      rawCategory: "Other Materials",
      subAssembly: "Adjustment",
      value: roundMoney(Math.abs(rawDiff)),
    });
  }

  const discount = input.quotations.reduce(
    (sum, quotation) =>
      sum + Math.max(0, normalizePercent(quotation.totalBeforeDisc) - normalizePercent(quotation.totalAfterDisc)),
    0
  );
  const netSelling = Math.max(0, grossTotal - discount);
  const ppn = input.quotations.reduce((sum, quotation) => sum + normalizePercent(quotation.totalPPN), 0);
  const pph = input.quotations.reduce((sum, quotation) => sum + normalizePercent(quotation.totalPPH), 0);
  const grandTotal = netSelling + ppn + pph;

  return {
    rawContributions,
    hpp: roundMoney(hpp),
    overhead: roundMoney(overhead),
    contingency: roundMoney(contingency),
    eskalasi: roundMoney(eskalasi),
    asuransi: roundMoney(asuransi),
    mobilisasi: roundMoney(mobilisasi),
    margin: roundMoney(margin),
    grossTotal: roundMoney(grossTotal),
    discount: roundMoney(discount),
    netSelling: roundMoney(netSelling),
    ppn: roundMoney(ppn),
    pph: roundMoney(pph),
    grandTotal: roundMoney(grandTotal),
  };
}

function revenueTrendFromData(input: DashboardAnalyticsInput, now: Date): DashboardApiResponse["revenueTrend"] {
  const start = addUtcMonths(startOfUtcMonth(now), -11);
  const keys = Array.from({ length: 12 }, (_, idx) => monthKey(addUtcMonths(start, idx)));
  const byMonth = new Map<string, { bookedRevenue: number; potentialRevenue: number }>();

  for (const key of keys) {
    byMonth.set(key, { bookedRevenue: 0, potentialRevenue: 0 });
  }

  for (const quotation of input.quotations) {
    const key = monthKey(quotation.tanggal);
    const bucket = byMonth.get(key);
    if (!bucket) continue;
    const status = quotation.status.toLowerCase();
    const amount = asBookedRevenueAmount(quotation);
    if (BOOKED_QUOTATION_STATUSES.has(status)) {
      bucket.bookedRevenue += amount;
      continue;
    }
    if (POTENTIAL_QUOTATION_STATUSES.has(status)) {
      bucket.potentialRevenue += amount;
    }
  }

  return {
    period: "monthly",
    series: keys.map((key) => {
      const bucket = byMonth.get(key) ?? { bookedRevenue: 0, potentialRevenue: 0 };
      return {
        month: key,
        bookedRevenue: roundMoney(bucket.bookedRevenue),
        potentialRevenue: roundMoney(bucket.potentialRevenue),
      };
    }),
  };
}

function defaultCashOutBasis(quotation: DashboardQuotationInput): number {
  if (quotation.project) {
    const fromProject = normalizePercent(quotation.project.totalHPP);
    if (fromProject > EPSILON) return fromProject;
  }
  const netRevenue = asBookedRevenueAmount(quotation);
  return netRevenue * 0.75;
}

function cashflowProjectionFromData(
  input: DashboardAnalyticsInput,
  now: Date
): DashboardApiResponse["cashflowProjection"] {
  const start = startOfUtcMonth(now);
  const monthKeys = Array.from({ length: 12 }, (_, idx) => monthKey(addUtcMonths(start, idx)));
  const buckets = new Map<string, { projectedIn: number; projectedOut: number }>();

  for (const key of monthKeys) {
    buckets.set(key, { projectedIn: 0, projectedOut: 0 });
  }

  let explicitTermCount = 0;
  let defaultFallbackCount = 0;
  let deterministicFallbackCount = 0;

  const bookedQuotations = input.quotations.filter((quotation) =>
    BOOKED_QUOTATION_STATUSES.has(quotation.status.toLowerCase())
  );

  for (const quotation of bookedQuotations) {
    const installments = resolveInstallments(quotation.paymentTerms, input.defaultPaymentTerms);
    const quotationMonth = startOfUtcMonth(quotation.tanggal);
    const revenueBase = asBookedRevenueAmount(quotation);

    for (const installment of installments) {
      if (installment.basis === "explicit") explicitTermCount += 1;
      if (installment.basis === "default-fallback") defaultFallbackCount += 1;
      if (installment.basis === "fallback") deterministicFallbackCount += 1;

      const dueMonth = addUtcMonths(quotationMonth, installment.monthOffset);
      const idx = diffUtcMonths(start, dueMonth);
      if (idx < 0 || idx >= monthKeys.length) continue;
      const key = monthKeys[idx];
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.projectedIn += revenueBase * (installment.percent / 100);
    }

    const cashOutBase = defaultCashOutBasis(quotation);
    const outDist: Array<[number, number]> = [
      [0, 0.6],
      [1, 0.4],
    ];
    for (const [offset, weight] of outDist) {
      const dueMonth = addUtcMonths(quotationMonth, offset);
      const idx = diffUtcMonths(start, dueMonth);
      if (idx < 0 || idx >= monthKeys.length) continue;
      const key = monthKeys[idx];
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.projectedOut += cashOutBase * weight;
    }
  }

  const assumptions: DashboardCashflowAssumptions = {
    termRuleUsed: "pattern-percent-parser + deterministic 50/50 fallback",
    confidenceNote:
      deterministicFallbackCount > 0
        ? "Some payment terms were unrecognized and used deterministic 50/50 fallback."
        : defaultFallbackCount > 0
          ? "Some payment terms used default App Settings fallback parser."
          : explicitTermCount > 0
            ? "Payment terms parsed from quotation text patterns."
            : "No booked quotations available; projection is empty.",
  };

  return {
    assumptions,
    series: monthKeys.map((key) => {
      const bucket = buckets.get(key) ?? { projectedIn: 0, projectedOut: 0 };
      const projectedIn = roundMoney(bucket.projectedIn);
      const projectedOut = roundMoney(bucket.projectedOut);
      return {
        month: key,
        projectedIn,
        projectedOut,
        projectedNet: roundMoney(projectedIn - projectedOut),
      };
    }),
  };
}

function topDriversFromData(input: DashboardAnalyticsInput): DashboardApiResponse["topDrivers"] {
  const topGrossProfitProjects = input.projects
    .map((project) => {
      const sellingValue = normalizePercent(project.totalSelling);
      const hppValue = normalizePercent(project.totalHPP);
      const grossProfit = Math.max(0, sellingValue - hppValue);
      const grossMarginPct = sellingValue > EPSILON ? (grossProfit / sellingValue) * 100 : 0;
      return {
        projectId: project.id,
        projectName: project.name,
        grossProfit: roundMoney(grossProfit),
        grossMarginPct: roundMoney(grossMarginPct),
        sellingValue: roundMoney(sellingValue),
        hppValue: roundMoney(hppValue),
      };
    })
    .filter((project) => project.grossProfit > EPSILON)
    .sort((a, b) => b.grossProfit - a.grossProfit)
    .slice(0, 5);

  const bookedRevenueByProject = new Map<string, number>();
  for (const quotation of input.quotations) {
    const status = quotation.status.toLowerCase();
    if (!BOOKED_QUOTATION_STATUSES.has(status)) continue;
    if (!quotation.projectId) continue;
    const current = bookedRevenueByProject.get(quotation.projectId) ?? 0;
    bookedRevenueByProject.set(quotation.projectId, current + asBookedRevenueAmount(quotation));
  }

  const topMarginErosionProjects = input.projects
    .map((project) => {
      const expectedSelling = normalizePercent(project.totalSelling);
      const quotedNetRevenue = normalizePercent(bookedRevenueByProject.get(project.id) ?? 0);
      const erosionValue = Math.max(0, expectedSelling - quotedNetRevenue);
      const erosionPct = expectedSelling > EPSILON ? (erosionValue / expectedSelling) * 100 : 0;
      return {
        projectId: project.id,
        projectName: project.name,
        expectedSelling: roundMoney(expectedSelling),
        quotedNetRevenue: roundMoney(quotedNetRevenue),
        erosionValue: roundMoney(erosionValue),
        erosionPct: roundMoney(erosionPct),
      };
    })
    .filter((project) => project.erosionValue > EPSILON)
    .sort((a, b) => b.erosionValue - a.erosionValue)
    .slice(0, 5);

  return {
    topGrossProfitProjects,
    topMarginErosionProjects,
  };
}

export function buildDashboardAnalyticsPayload(
  input: DashboardAnalyticsInput,
  now = new Date()
): DashboardApiResponse {
  const options = input.projects.map((project) => ({
    id: project.id,
    name: project.name,
  }));
  const selectedCandidate = input.selectedProjectId ?? null;
  const hasSelected = selectedCandidate
    ? input.projects.some((project) => project.id === selectedCandidate)
    : false;
  const selectedProjectId = hasSelected ? selectedCandidate : null;

  const scopedInput: DashboardAnalyticsInput = selectedProjectId
    ? {
        ...input,
        projects: input.projects.filter((project) => project.id === selectedProjectId),
        quotations: input.quotations.filter((quotation) => quotation.projectId === selectedProjectId),
      }
    : input;

  if (scopedInput.projects.length === 0 && scopedInput.quotations.length === 0) {
    return {
      ...EMPTY_DASHBOARD_RESPONSE,
      projectScope: {
        selectedProjectId,
        options,
      },
    };
  }

  const costingData = costingDataFromData(scopedInput);

  return {
    projectScope: {
      selectedProjectId,
      options,
    },
    kpis: kpiFromData(scopedInput, now),
    costingData,
    sankey: sankeyFromData(scopedInput, now),
    revenueTrend: revenueTrendFromData(scopedInput, now),
    cashflowProjection: cashflowProjectionFromData(scopedInput, now),
    topDrivers: topDriversFromData(scopedInput),
  };
}
