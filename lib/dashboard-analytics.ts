import type {
  DashboardApiResponse,
  DashboardCashflowAssumptions,
  DashboardRange,
} from "@/lib/dashboard-contract";
import { EMPTY_DASHBOARD_RESPONSE } from "@/lib/dashboard-contract";
import { getDashboardRangeStart } from "@/lib/dashboard-range";
import { finite } from "@/lib/calculations";
import { computeCostSummary, marginTogglesFromProject } from "@/lib/cost-summary";
import { effectiveSectionSubtotal } from "@/lib/section-subtotal";
import { buildArAging } from "@/lib/o2c/ar-aging";
import {
  isBookedQuotationStatus,
  isLostQuotationStatus,
  isPotentialQuotationStatus,
  isWonQuotationStatus,
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
  priceAdjustmentPct: number;
  priceAdjustmentAmt: number;
  updatedAt: Date;
  segments: Array<{
    type: string;
    sections: Array<{
      category: string;
      subtotal: number;
      overrideSubtotal?: number | null;
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

export type DashboardSalesOrderInput = {
  id: string;
  status: string;
  tanggal: Date;
  grandTotal: number;
};

export type DashboardInvoiceInput = {
  id: string;
  invNumber: string | null;
  customerId: string;
  customerName: string;
  status: string;
  dueDate: Date | null;
  tanggal: Date;
  grandTotal: number;
  paidTotal: number;
};

export type DashboardAnalyticsInput = {
  projects: DashboardProjectInput[];
  quotations: DashboardQuotationInput[];
  defaultPaymentTerms: string;
  selectedProjectId?: string | null;
  range?: DashboardRange;
  /** When present, booked revenue KPIs prefer Sales Orders (open/delivered). */
  salesOrders?: DashboardSalesOrderInput[];
  invoices?: DashboardInvoiceInput[];
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
  return getDashboardRangeStart(range, now);
}

function isDateInRange(date: Date, range: DashboardRange, now: Date): boolean {
  const start = getRangeStart(range, now);
  if (!start) return true;
  const day = startOfUtcDay(date).getTime();
  const startDay = startOfUtcDay(start).getTime();
  const nowDay = startOfUtcDay(now).getTime();
  return day >= startDay && day <= nowDay;
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
  const wonCount = rangeQuotations.filter((q) => isWonQuotationStatus(q.status)).length;
  const lostCount = rangeQuotations.filter((q) => isLostQuotationStatus(q.status)).length;
  const decided = wonCount + lostCount;
  const winRatePct =
    decided > 0
      ? (wonCount / decided) * 100
      : rangeQuotations.length > 0
        ? (approvedQuotation / rangeQuotations.length) * 100
        : 0;

  const soRows = (input.salesOrders ?? []).filter(
    (so) => !["cancelled"].includes((so.status ?? "").toLowerCase())
  );
  const taxExposurePpn = rangeQuotations.reduce((sum, quotation) => sum + normalizePercent(quotation.totalPPN), 0);
  const taxExposurePph = rangeQuotations.reduce((sum, quotation) => sum + normalizePercent(quotation.totalPPH), 0);

  const utcNow = now;
  const ytdStart = new Date(Date.UTC(utcNow.getUTCFullYear(), 0, 1));
  const mtdStart = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1));

  let bookedRevenueMtd = 0;
  let bookedRevenueYtd = 0;

  if (soRows.length > 0) {
    for (const so of soRows) {
      const amount = normalizePercent(so.grandTotal);
      if (so.tanggal >= ytdStart && so.tanggal <= utcNow) {
        bookedRevenueYtd += amount;
      }
      if (so.tanggal >= mtdStart && so.tanggal <= utcNow) {
        bookedRevenueMtd += amount;
      }
    }
  } else {
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
  }

  const soBacklog =
    soRows.length > 0
      ? soRows
          .filter((so) =>
            ["open", "partially_delivered", "delivered"].includes(
              (so.status ?? "").toLowerCase()
            )
          )
          .reduce((sum, so) => sum + normalizePercent(so.grandTotal), 0)
      : backlogValue;

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
    backlogValue: roundMoney(soBacklog),
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
        priceAdjustmentPct: project.priceAdjustmentPct,
        priceAdjustmentAmt: project.priceAdjustmentAmt,
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
  const bookedQuotations = scopedQuotations.filter((quotation) =>
    isBookedQuotationStatus(quotation.status)
  );

  const discountAmount = bookedQuotations.reduce(
    (sum, quotation) =>
      sum + Math.max(0, normalizePercent(quotation.totalBeforeDisc) - normalizePercent(quotation.totalAfterDisc)),
    0
  );
  const ppnAmount = bookedQuotations.reduce((sum, quotation) => sum + normalizePercent(quotation.totalPPN), 0);
  const pphAmount = bookedQuotations.reduce((sum, quotation) => sum + normalizePercent(quotation.totalPPH), 0);
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
        priceAdjustmentPct: project.priceAdjustmentPct,
        priceAdjustmentAmt: project.priceAdjustmentAmt,
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
            addRaw(
              "Other Materials",
              subAssembly,
              effectiveSectionSubtotal(section)
            );
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

  const bookedQuotations = input.quotations.filter((quotation) =>
    isBookedQuotationStatus(quotation.status)
  );
  const discount = bookedQuotations.reduce(
    (sum, quotation) =>
      sum + Math.max(0, normalizePercent(quotation.totalBeforeDisc) - normalizePercent(quotation.totalAfterDisc)),
    0
  );
  const netSelling = Math.max(0, grossTotal - discount);
  const ppn = bookedQuotations.reduce((sum, quotation) => sum + normalizePercent(quotation.totalPPN), 0);
  const pph = bookedQuotations.reduce((sum, quotation) => sum + normalizePercent(quotation.totalPPH), 0);
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

function revenueTrendFromData(
  input: DashboardAnalyticsInput,
  now: Date,
  range: DashboardRange
): DashboardApiResponse["revenueTrend"] {
  const start = addUtcMonths(startOfUtcMonth(now), -11);
  const keys = Array.from({ length: 12 }, (_, idx) => monthKey(addUtcMonths(start, idx)));
  const byMonth = new Map<string, { bookedRevenue: number; potentialRevenue: number }>();

  for (const key of keys) {
    byMonth.set(key, { bookedRevenue: 0, potentialRevenue: 0 });
  }

  for (const quotation of input.quotations) {
    if (!isDateInRange(quotation.tanggal, range, now)) continue;
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

  const openInvoices = (input.invoices ?? []).filter((inv) => {
    const s = (inv.status ?? "").toLowerCase();
    if (s === "void" || s === "draft" || s === "paid") return false;
    return inv.grandTotal - inv.paidTotal > 0.01;
  });

  if (openInvoices.length > 0) {
    for (const inv of openInvoices) {
      const openAmt = Math.max(0, inv.grandTotal - inv.paidTotal);
      const due = inv.dueDate ?? inv.tanggal;
      const dueMonth = startOfUtcMonth(due);
      const idx = diffUtcMonths(start, dueMonth);
      if (idx < 0 || idx >= monthKeys.length) continue;
      const key = monthKeys[idx];
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.projectedIn += openAmt;
    }
  } else {
    const bookedQuotations = input.quotations.filter((quotation) =>
      isBookedQuotationStatus(quotation.status)
    );

    for (const quotation of bookedQuotations) {
      const installments = resolveInstallments(
        quotation.paymentTerms,
        input.defaultPaymentTerms
      );
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
  }

  const assumptions: DashboardCashflowAssumptions = {
    termRuleUsed:
      openInvoices.length > 0
        ? "invoice-due-date open AR"
        : "pattern-percent-parser + deterministic 50/50 fallback",
    confidenceNote:
      openInvoices.length > 0
        ? "Projected inflows from unpaid invoices by due date."
        : deterministicFallbackCount > 0
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

function quotationFunnelFromData(
  input: DashboardAnalyticsInput,
  now: Date,
  range: DashboardRange
): DashboardApiResponse["quotationFunnel"] {
  const scoped = input.quotations.filter((quotation) => isDateInRange(quotation.tanggal, range, now));
  let draftCount = 0;
  let finalCount = 0;
  let approvedCount = 0;
  let bookedCount = 0;
  let sentCount = 0;
  let wonCount = 0;
  let lostCount = 0;

  for (const quotation of scoped) {
    const normalized = normalizeStatus(quotation.status);
    if (normalized === "draft") draftCount += 1;
    if (normalized === "finalized") finalCount += 1;
    if (normalized === "approved") approvedCount += 1;
    if (normalized === "sent") sentCount += 1;
    if (isWonQuotationStatus(quotation.status)) wonCount += 1;
    if (isLostQuotationStatus(quotation.status)) lostCount += 1;
    if (isBookedQuotationStatus(quotation.status)) bookedCount += 1;
  }

  const totalCount = scoped.length;
  const decided = wonCount + lostCount;
  const winRatePct =
    decided > 0
      ? (wonCount / decided) * 100
      : totalCount > 0
        ? (bookedCount / totalCount) * 100
        : 0;
  return {
    draftCount,
    finalCount,
    approvedCount,
    bookedCount,
    totalCount,
    winRatePct: roundMoney(winRatePct),
    sentCount,
    wonCount,
    lostCount,
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
  const allRows = input.quotations
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
    .sort((a, b) => b.ageDays - a.ageDays);

  const expiredCount = allRows.filter((row) => row.isExpired).length;

  return {
    rows: allRows.slice(0, 12),
    expiredCount,
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
  const allOptions = input.projects.map((project) => ({
    id: project.id,
    name: project.name,
  }));
  const selectedCandidate = input.selectedProjectId ?? null;
  const hasSelected = selectedCandidate
    ? input.projects.some((project) => project.id === selectedCandidate)
    : false;

  if (selectedCandidate && !hasSelected) {
    return {
      ...EMPTY_DASHBOARD_RESPONSE,
      range,
      projectScope: {
        selectedProjectId: selectedCandidate,
        options: [],
      },
    };
  }

  const selectedProjectId = hasSelected ? selectedCandidate : null;
  const scopeOptions = selectedProjectId
    ? allOptions.filter((option) => option.id === selectedProjectId)
    : allOptions;

  const scopedInput: DashboardAnalyticsInput = selectedProjectId
    ? {
        ...input,
        projects: input.projects.filter((project) => project.id === selectedProjectId),
        quotations: input.quotations.filter((quotation) => quotation.projectId === selectedProjectId),
      }
    : input;

  const hasO2c =
    (scopedInput.salesOrders?.length ?? 0) > 0 ||
    (scopedInput.invoices?.length ?? 0) > 0;

  if (
    scopedInput.projects.length === 0 &&
    scopedInput.quotations.length === 0 &&
    !hasO2c
  ) {
    return {
      ...EMPTY_DASHBOARD_RESPONSE,
      range,
      projectScope: {
        selectedProjectId,
        options: scopeOptions,
      },
    };
  }

  const soList = scopedInput.salesOrders ?? [];
  const invList = scopedInput.invoices ?? [];
  const ar = buildArAging(
    invList.map((inv) => ({
      id: inv.id,
      invNumber: inv.invNumber,
      customerId: inv.customerId,
      customerName: inv.customerName,
      dueDate: inv.dueDate,
      grandTotal: inv.grandTotal,
      paidTotal: inv.paidTotal,
      status: inv.status,
    })),
    now
  );

  return {
    range,
    projectScope: {
      selectedProjectId,
      options: scopeOptions,
    },
    kpis: kpiFromData(scopedInput, now, range),
    costingData: costingDataFromData(scopedInput),
    sankey: sankeyFromData(scopedInput, now),
    revenueTrend: revenueTrendFromData(scopedInput, now, range),
    cashflowProjection: cashflowProjectionFromData(scopedInput, now),
    quotationFunnel: quotationFunnelFromData(scopedInput, now, range),
    statusDistribution: statusDistributionFromData(scopedInput, now, range),
    quotationAging: quotationAgingFromData(scopedInput, now, range),
    discountMarginTrend: discountMarginTrendFromData(scopedInput, now, range),
    salesLeaderboard: salesLeaderboardFromData(scopedInput, now, range),
    o2cFunnel: {
      quoteCount: scopedInput.quotations.length,
      orderCount: soList.filter(
        (s) => (s.status ?? "").toLowerCase() !== "cancelled"
      ).length,
      deliveredCount: soList.filter((s) =>
        ["delivered", "partially_delivered"].includes(
          (s.status ?? "").toLowerCase()
        )
      ).length,
      invoicedCount: invList.filter(
        (i) => !["void", "draft"].includes((i.status ?? "").toLowerCase())
      ).length,
      paidCount: invList.filter(
        (i) => (i.status ?? "").toLowerCase() === "paid"
      ).length,
    },
    arAging: {
      totals: ar.totals,
      byCustomer: ar.byCustomer,
      rows: ar.rows.map((r) => ({
        invoiceId: r.invoiceId,
        invNumber: r.invNumber,
        customerName: r.customerName,
        openAmount: r.openAmount,
        daysPastDue: r.daysPastDue,
        bucket: r.bucket,
      })),
    },
  };
}
