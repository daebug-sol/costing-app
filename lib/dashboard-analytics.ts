import type {
  DashboardApiResponse,
  DashboardCashflowAssumptions,
  DashboardRange,
} from "@/lib/dashboard-contract";
import { EMPTY_DASHBOARD_RESPONSE } from "@/lib/dashboard-contract";
import { finite } from "@/lib/calculations";
import { computeCostSummary, marginTogglesFromProject } from "@/lib/cost-summary";
import {
  isBookedQuotationStatus,
  isPotentialQuotationStatus,
  normalizeStatus,
  statusLabel,
} from "@/lib/dashboard-status";

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
  salesman: string | null;
  tanggal: Date;
  createdAt: Date;
  updatedAt: Date;
  projectId: string | null;
  clientName: string | null;
  clientCompany: string | null;
  validityDays: number;
  discount: number;
  discountEnabled: boolean;
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
  range?: DashboardRange;
};

type PaymentInstallment = {
  percent: number;
  monthOffset: number;
  basis: "explicit" | "fallback" | "default-fallback";
};

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

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function diffUtcDays(from: Date, to: Date): number {
  const msInDay = 24 * 60 * 60 * 1000;
  const fromDay = startOfUtcDay(from).getTime();
  const toDay = startOfUtcDay(to).getTime();
  return Math.max(0, Math.floor((toDay - fromDay) / msInDay));
}

function getRangeStart(range: DashboardRange, now: Date): Date | null {
  if (range === "mtd") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  if (range === "ytd") {
    return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  }
  if (range === "12m") {
    return addUtcMonths(startOfUtcMonth(now), -11);
  }
  return null;
}

function isDateInRange(date: Date, range: DashboardRange, now: Date): boolean {
  const start = getRangeStart(range, now);
  if (!start) return true;
  return date >= start && date <= now;
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

function kpiFromData(input: DashboardAnalyticsInput, now: Date, range: DashboardRange) {
  const quotations = input.quotations;
  const projects = input.projects;

  const totalProjects = projects.length;
  const activeCosting = projects.filter((project) => normalizeStatus(project.status) === "draft").length;
  const rangeQuotations = quotations.filter((quotation) => isDateInRange(quotation.tanggal, range, now));
  const pendingQuotation = rangeQuotations.filter((quotation) => isPotentialQuotationStatus(quotation.status)).length;
  const approvedQuotation = rangeQuotations.filter((quotation) => isBookedQuotationStatus(quotation.status)).length;

  const totalSelling = projects.reduce((sum, project) => sum + normalizePercent(project.totalSelling), 0);
  const totalGrossProfit = projects.reduce(
    (sum, project) => sum + (normalizePercent(project.totalSelling) - normalizePercent(project.totalHPP)),
    0
  );
  const weightedGrossMarginPct = totalSelling > EPSILON ? (totalGrossProfit / totalSelling) * 100 : 0;

  const discountLeakageValue = rangeQuotations
    .filter((quotation) => isBookedQuotationStatus(quotation.status))
    .reduce(
      (sum, quotation) =>
        sum + Math.max(0, normalizePercent(quotation.totalBeforeDisc) - normalizePercent(quotation.totalAfterDisc)),
      0
    );

  const pipelineValue = rangeQuotations
    .filter((quotation) => isPotentialQuotationStatus(quotation.status))
    .reduce((sum, quotation) => sum + asBookedRevenueAmount(quotation), 0);
  const backlogValue = rangeQuotations
    .filter((quotation) => isBookedQuotationStatus(quotation.status))
    .reduce((sum, quotation) => sum + asBookedRevenueAmount(quotation), 0);
  const totalCount = rangeQuotations.length;
  const winRatePct = totalCount > 0 ? (approvedQuotation / totalCount) * 100 : 0;
  const taxExposurePpn = rangeQuotations.reduce((sum, quotation) => sum + normalizePercent(quotation.totalPPN), 0);
  const taxExposurePph = rangeQuotations.reduce((sum, quotation) => sum + normalizePercent(quotation.totalPPH), 0);

  const utcNow = now;
  const ytdStart = new Date(Date.UTC(utcNow.getUTCFullYear(), 0, 1));
  const mtdStart = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1));

  let bookedRevenueMtd = 0;
  let bookedRevenueYtd = 0;

  for (const quotation of quotations) {
    if (!isBookedQuotationStatus(quotation.status)) continue;
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
    pipelineValue: roundMoney(pipelineValue),
    backlogValue: roundMoney(backlogValue),
    winRatePct: roundMoney(winRatePct),
    taxExposurePpn: roundMoney(taxExposurePpn),
    taxExposurePph: roundMoney(taxExposurePph),
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
    const amount = asBookedRevenueAmount(quotation);
    if (isBookedQuotationStatus(quotation.status)) {
      bucket.bookedRevenue += amount;
      continue;
    }
    if (isPotentialQuotationStatus(quotation.status)) {
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
    isBookedQuotationStatus(quotation.status)
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
    if (!isBookedQuotationStatus(quotation.status)) continue;
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

function quotationFunnelFromData(
  input: DashboardAnalyticsInput,
  now: Date,
  range: DashboardRange
): DashboardApiResponse["quotationFunnel"] {
  const scoped = input.quotations.filter((quotation) => isDateInRange(quotation.tanggal, range, now));
  let draftCount = 0;
  let finalCount = 0;
  let approvedCount = 0;

  for (const quotation of scoped) {
    const normalized = normalizeStatus(quotation.status);
    if (normalized === "draft") draftCount += 1;
    if (normalized === "finalized") finalCount += 1;
    if (normalized === "approved") approvedCount += 1;
  }

  const totalCount = scoped.length;
  const winRatePct = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;
  return {
    draftCount,
    finalCount,
    approvedCount,
    totalCount,
    winRatePct: roundMoney(winRatePct),
  };
}

function statusDistributionFromData(
  input: DashboardAnalyticsInput,
  now: Date,
  range: DashboardRange
): DashboardApiResponse["statusDistribution"] {
  const projectStatusMap = new Map<string, { count: number; value: number }>();
  for (const project of input.projects) {
    const key = statusLabel(normalizeStatus(project.status));
    const current = projectStatusMap.get(key) ?? { count: 0, value: 0 };
    current.count += 1;
    current.value += normalizePercent(project.totalSelling);
    projectStatusMap.set(key, current);
  }

  const quotationStatusMap = new Map<string, { count: number; value: number }>();
  for (const quotation of input.quotations) {
    if (!isDateInRange(quotation.tanggal, range, now)) continue;
    const key = statusLabel(normalizeStatus(quotation.status));
    const current = quotationStatusMap.get(key) ?? { count: 0, value: 0 };
    current.count += 1;
    current.value += asBookedRevenueAmount(quotation);
    quotationStatusMap.set(key, current);
  }

  const toRows = (map: Map<string, { count: number; value: number }>) =>
    Array.from(map.entries())
      .map(([status, metrics]) => ({
        status,
        count: metrics.count,
        value: roundMoney(metrics.value),
      }))
      .sort((a, b) => b.count - a.count || b.value - a.value);

  return {
    projectStatus: toRows(projectStatusMap),
    quotationStatus: toRows(quotationStatusMap),
  };
}

function quotationAgingFromData(
  input: DashboardAnalyticsInput,
  now: Date,
  range: DashboardRange
): DashboardApiResponse["quotationAging"] {
  const rows = input.quotations
    .filter((quotation) => isDateInRange(quotation.tanggal, range, now))
    .map((quotation) => {
      const validityDays = Math.max(0, Math.round(normalizePercent(quotation.validityDays)));
      const ageDays = diffUtcDays(quotation.tanggal, now);
      const expiryDate = addUtcDays(startOfUtcDay(quotation.tanggal), validityDays);
      const isExpired = now > expiryDate;
      const clientLabel =
        quotation.clientCompany?.trim() || quotation.clientName?.trim() || "Unknown client";
      const discountValue =
        quotation.discountEnabled
          ? Math.max(0, normalizePercent(quotation.totalBeforeDisc) - normalizePercent(quotation.totalAfterDisc))
          : 0;
      return {
        quotationId: quotation.id,
        status: statusLabel(normalizeStatus(quotation.status)),
        tanggal: quotation.tanggal.toISOString(),
        ageDays,
        validityDays,
        expiryDate: expiryDate.toISOString(),
        isExpired,
        clientLabel,
        discountValue: roundMoney(discountValue),
        totalAfterDisc: roundMoney(normalizePercent(quotation.totalAfterDisc)),
      };
    })
    .sort((a, b) => b.ageDays - a.ageDays)
    .slice(0, 12);

  return {
    rows,
    expiredCount: rows.filter((row) => row.isExpired).length,
    generatedAt: now.toISOString(),
  };
}

function discountMarginTrendFromData(
  input: DashboardAnalyticsInput,
  now: Date,
  range: DashboardRange
): DashboardApiResponse["discountMarginTrend"] {
  const start = addUtcMonths(startOfUtcMonth(now), -11);
  const keys = Array.from({ length: 12 }, (_, idx) => monthKey(addUtcMonths(start, idx)));
  const buckets = new Map<
    string,
    { discountLeakage: number; bookedRevenue: number; grossProfit: number; selling: number }
  >();

  for (const key of keys) {
    buckets.set(key, { discountLeakage: 0, bookedRevenue: 0, grossProfit: 0, selling: 0 });
  }

  for (const quotation of input.quotations) {
    if (!isDateInRange(quotation.tanggal, range, now)) continue;
    const key = monthKey(quotation.tanggal);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const discountValue = Math.max(
      0,
      normalizePercent(quotation.totalBeforeDisc) - normalizePercent(quotation.totalAfterDisc)
    );
    bucket.discountLeakage += discountValue;
    if (isBookedQuotationStatus(quotation.status)) {
      bucket.bookedRevenue += asBookedRevenueAmount(quotation);
    }
  }

  for (const project of input.projects) {
    const key = monthKey(project.updatedAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const selling = normalizePercent(project.totalSelling);
    const grossProfit = Math.max(0, selling - normalizePercent(project.totalHPP));
    bucket.selling += selling;
    bucket.grossProfit += grossProfit;
  }

  return {
    period: "monthly",
    series: keys.map((key) => {
      const bucket = buckets.get(key) ?? { discountLeakage: 0, bookedRevenue: 0, grossProfit: 0, selling: 0 };
      const weightedMarginPct = bucket.selling > EPSILON ? (bucket.grossProfit / bucket.selling) * 100 : 0;
      return {
        month: key,
        discountLeakage: roundMoney(bucket.discountLeakage),
        bookedRevenue: roundMoney(bucket.bookedRevenue),
        weightedMarginPct: roundMoney(weightedMarginPct),
      };
    }),
  };
}

function segmentMixFromData(input: DashboardAnalyticsInput): DashboardApiResponse["segmentMix"] {
  const byType = new Map<"ahu" | "manual" | "other", number>([
    ["ahu", 0],
    ["manual", 0],
    ["other", 0],
  ]);

  for (const project of input.projects) {
    for (const segment of project.segments) {
      const normalized: "ahu" | "manual" | "other" =
        segment.type === "ahu" ? "ahu" : segment.type === "manual" ? "manual" : "other";
      byType.set(normalized, (byType.get(normalized) ?? 0) + normalizePercent(segment.subtotal));
    }
  }

  const total = Array.from(byType.values()).reduce((sum, value) => sum + value, 0);
  const rows = Array.from(byType.entries())
    .map(([segmentType, value]) => ({
      segmentType,
      value: roundMoney(value),
      pct: total > EPSILON ? roundMoney((value / total) * 100) : 0,
    }))
    .filter((row) => row.value > EPSILON)
    .sort((a, b) => b.value - a.value);

  return { rows };
}

function topClientFromData(
  input: DashboardAnalyticsInput,
  now: Date,
  range: DashboardRange
): DashboardApiResponse["topClient"] {
  const byClient = new Map<string, { bookedRevenue: number; quotationCount: number }>();
  for (const quotation of input.quotations) {
    if (!isDateInRange(quotation.tanggal, range, now)) continue;
    if (!isBookedQuotationStatus(quotation.status)) continue;
    const client = quotation.clientCompany?.trim() || quotation.clientName?.trim() || "Unknown client";
    const current = byClient.get(client) ?? { bookedRevenue: 0, quotationCount: 0 };
    current.bookedRevenue += asBookedRevenueAmount(quotation);
    current.quotationCount += 1;
    byClient.set(client, current);
  }

  const totalBookedRevenue = Array.from(byClient.values()).reduce((sum, row) => sum + row.bookedRevenue, 0);
  const rows = Array.from(byClient.entries())
    .map(([client, value]) => ({
      client,
      bookedRevenue: roundMoney(value.bookedRevenue),
      quotationCount: value.quotationCount,
      concentrationPct: totalBookedRevenue > EPSILON ? roundMoney((value.bookedRevenue / totalBookedRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.bookedRevenue - a.bookedRevenue)
    .slice(0, 5);

  return { rows };
}

function salesLeaderboardFromData(
  input: DashboardAnalyticsInput,
  now: Date,
  range: DashboardRange
): DashboardApiResponse["salesLeaderboard"] {
  const scoped = input.quotations.filter((quotation) => isDateInRange(quotation.tanggal, range, now));
  const hasSalesman = scoped.some((quotation) => (quotation.salesman ?? "").trim().length > 0);

  const byPrincipal = new Map<
    string,
    {
      bookedRevenue: number;
      quotationCount: number;
      approvedCount: number;
      draftCount: number;
      marginSum: number;
      marginCount: number;
      pipelineValue: number;
    }
  >();

  for (const quotation of scoped) {
    const principal = hasSalesman
      ? (quotation.salesman?.trim() || "Tanpa salesman")
      : (quotation.clientCompany?.trim() || quotation.clientName?.trim() || "Klien tidak diketahui");
    const current = byPrincipal.get(principal) ?? {
      bookedRevenue: 0,
      quotationCount: 0,
      approvedCount: 0,
      draftCount: 0,
      marginSum: 0,
      marginCount: 0,
      pipelineValue: 0,
    };

    const status = normalizeStatus(quotation.status);
    const revenue = asBookedRevenueAmount(quotation);
    const hpp = normalizePercent(quotation.project?.totalHPP ?? 0);
    const marginPct = revenue > EPSILON ? ((revenue - hpp) / revenue) * 100 : 0;

    current.quotationCount += 1;
    if (isBookedQuotationStatus(status)) {
      current.bookedRevenue += revenue;
      current.approvedCount += 1;
      current.marginSum += marginPct;
      current.marginCount += 1;
    } else if (isPotentialQuotationStatus(status)) {
      current.draftCount += 1;
      current.pipelineValue += revenue;
    }
    byPrincipal.set(principal, current);
  }

  const rows = Array.from(byPrincipal.entries())
    .map(([principal, metrics]) => ({
      principal,
      bookedRevenue: roundMoney(metrics.bookedRevenue),
      quotationCount: metrics.quotationCount,
      winRatePct:
        metrics.quotationCount > 0
          ? roundMoney((metrics.approvedCount / metrics.quotationCount) * 100)
          : 0,
      avgMarginPct:
        metrics.marginCount > 0 ? roundMoney(metrics.marginSum / metrics.marginCount) : 0,
      pipelineValue: roundMoney(metrics.pipelineValue),
    }))
    .sort((a, b) => b.bookedRevenue - a.bookedRevenue || b.pipelineValue - a.pipelineValue)
    .slice(0, 7);

  return {
    mode: hasSalesman ? "salesman" : "client",
    rows,
  };
}

export function buildDashboardAnalyticsPayload(
  input: DashboardAnalyticsInput,
  now = new Date()
): DashboardApiResponse {
  const range = input.range ?? "all";
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
      range,
      projectScope: {
        selectedProjectId,
        options,
      },
    };
  }

  const costingData = costingDataFromData(scopedInput);

  return {
    range,
    projectScope: {
      selectedProjectId,
      options,
    },
    kpis: kpiFromData(scopedInput, now, range),
    costingData,
    sankey: sankeyFromData(scopedInput, now),
    revenueTrend: revenueTrendFromData(scopedInput, now),
    cashflowProjection: cashflowProjectionFromData(scopedInput, now),
    topDrivers: topDriversFromData(scopedInput),
    quotationFunnel: quotationFunnelFromData(scopedInput, now, range),
    statusDistribution: statusDistributionFromData(scopedInput, now, range),
    quotationAging: quotationAgingFromData(scopedInput, now, range),
    discountMarginTrend: discountMarginTrendFromData(scopedInput, now, range),
    segmentMix: segmentMixFromData(scopedInput),
    topClient: topClientFromData(scopedInput, now, range),
    salesLeaderboard: salesLeaderboardFromData(scopedInput, now, range),
  };
}
