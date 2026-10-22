/**
 * Demo data generator: one year of realistic activity (customers, quotations,
 * costing projects, orders, invoices, payments) written into ONE organization.
 * Used by the CLI seed (`prisma/seed-demo.ts`, fixed demo org) and by the app
 * (trial organizations: sample data on activation, "Reset demo" in Settings).
 * Every write and delete is scoped to the given organization id.
 */

import { prisma } from "./prisma";
import { computeCostSummary } from "./cost-summary";
import { ensureDefaultFolders, defaultAhuFileId } from "./database-folders";
import {
  AHU_MODELS,
  AHU_SECTIONS,
  COMPONENTS,
  CUSTOMERS,
  FIRST_NAMES,
  LAST_NAMES,
  LOST_REASONS,
  MANUAL_RECIPES,
  MATERIALS,
  PAYMENT_TERMS,
  PROFILES,
  SALES,
  SCOPES,
  SEASONALITY,
  type CustomerSeed,
  type SalesPerson,
} from "../prisma/demo/data";

const DAY = 86_400_000;
const PPN = 11;

// ---------- deterministic helpers ----------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 20261012;
let rand = mulberry32(SEED);
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const int = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));
const chance = (p: number) => rand() < p;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
function weighted<T>(items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const r100 = (n: number) => Math.round(n / 100) * 100;
const stale0 = (d: Date, a: Date) => a.getTime() - d.getTime() > 45 * DAY;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const dayStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const periodOf = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const phone = () => `08${int(11, 99)}${int(1000, 9999)}${int(1000, 9999)}`;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function todayAnchor(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0));
}

// ---------- row types ----------

type Row = Record<string, unknown>;

const rows = {
  materials: [] as Row[],
  profiles: [] as Row[],
  components: [] as Row[],
  customers: [] as Row[],
  projects: [] as Row[],
  segments: [] as Row[],
  sections: [] as Row[],
  lineItems: [] as Row[],
  groups: [] as Row[],
  mItems: [] as Row[],
  quotations: [] as Row[],
  revisions: [] as Row[],
  quotationItems: [] as Row[],
  salesOrders: [] as Row[],
  soItems: [] as Row[],
  deliveries: [] as Row[],
  deliveryItems: [] as Row[],
  invoices: [] as Row[],
  invoiceItems: [] as Row[],
  payments: [] as Row[],
  allocations: [] as Row[],
};
const quotationConversions: Array<{ quotationId: string; soId: string }> = [];
const seqCounts = new Map<string, number>();
const wonByMonth = new Map<string, number>();
let currentMonthWins = 0;

/** Id prefix; per-org so several orgs can hold demo data (primary keys are global). */
let tag = "demo";
let idCounter = 0;
const nid = (kind: string) => `${tag}_${kind}_${String(++idCounter).padStart(5, "0")}`;

function docNumber(prefix: string, type: string, date: Date): string {
  const period = periodOf(date);
  const key = `${type}:${period}`;
  const n = (seqCounts.get(key) ?? 0) + 1;
  seqCounts.set(key, n);
  return `${prefix}-${period}-${String(n).padStart(4, "0")}`;
}

// ---------- catalog ----------

const materialIds = new Map<string, string>();
const profileIds = new Map<string, string>();
const componentIds = new Map<string, string>();
const catalogPrice = new Map<string, { id: string; code: string; name: string; category: string; uom: string; price: number }>();

function buildCatalog(orgId: string, anchor: Date) {
  const born = addDays(anchor, -400);
  for (const m of MATERIALS) {
    const id = `${tag}_mat_${slugify(m.code)}`;
    materialIds.set(m.code, id);
    catalogPrice.set(`material:${m.code}`, { id, code: m.code, name: m.name, category: m.category, uom: "kg", price: m.pricePerKg });
    rows.materials.push({
      id, organizationId: orgId, datasetFileId: defaultAhuFileId(orgId, "materials"),
      code: m.code, name: m.name, category: m.category, density: m.density, pricePerKg: m.pricePerKg,
      currency: "IDR", unit: "kg", createdAt: born,
    });
  }
  for (const p of PROFILES) {
    const id = `${tag}_prof_${slugify(p.code)}`;
    profileIds.set(p.code, id);
    rows.profiles.push({
      id, organizationId: orgId, datasetFileId: defaultAhuFileId(orgId, "profiles"),
      code: p.code, name: p.name, type: p.type, weightPerM: p.weightPerM, pricePerM: p.pricePerM,
      panelThick: p.panelThick, createdAt: born,
    });
  }
  for (const c of COMPONENTS) {
    const id = `${tag}_comp_${slugify(c.code)}`;
    componentIds.set(c.code, id);
    catalogPrice.set(`component:${c.code}`, { id, code: c.code, name: c.name, category: c.category, uom: c.unit, price: c.unitPrice });
    rows.components.push({
      id, organizationId: orgId, datasetFileId: defaultAhuFileId(orgId, "components"),
      code: c.code, name: c.name, category: c.category, unitPrice: c.unitPrice, currency: "IDR", unit: c.unit,
      supplier: c.supplier, leadTimeDays: c.category === "Jasa" ? null : int(7, 45), createdAt: born,
    });
  }
}

// ---------- costing projects ----------

type ProjectPlan = {
  id: string;
  name: string;
  selling: number;
  hpp: number;
  kind: "ahu" | "manual";
  units: number;
  flow: number | null;
  model: string | null;
  spec: string;
};

type Pricing = {
  overhead: number; contingency: number; eskalasi: number; asuransi: number; mobilisasi: number;
  margin: number; priceAdjustmentPct: number; priceAdjustmentAmt: number;
};

function buildProject(opts: {
  orgId: string;
  customer: CustomerSeed;
  date: Date;
  status: "draft" | "final";
  updatedAt?: Date;
  kind?: "ahu" | "manual";
  scale?: number;
}): ProjectPlan {
  const { orgId, customer, date, status } = opts;
  const kind = opts.kind ?? (chance(0.58) ? "ahu" : "manual");
  const scale = opts.scale ?? 1;
  const projectId = nid("proj");
  const scope = pick(SCOPES[customer.sector][kind]);
  const name = `${scope} - ${customer.company}`;
  const createdAt = addDays(date, -int(1, 6));
  const updatedAt = opts.updatedAt ?? addDays(date, int(0, 2));

  const pricing: Pricing = {
    overhead: 5, contingency: 3,
    eskalasi: chance(0.2) ? 2 : 0, asuransi: chance(0.15) ? 1 : 0, mobilisasi: chance(0.2) ? 2 : 0,
    margin: Math.round(between(14, 28) * 2) / 2,
    priceAdjustmentPct: 0, priceAdjustmentAmt: 0,
  };

  const segCount = weighted([1, 2, 3], [0.72, 0.22, 0.06]);
  let hppTotal = 0;
  let flowFirst: number | null = null;
  let modelFirst: string | null = null;
  let units = 1;
  let spec = "";

  for (let s = 0; s < segCount; s += 1) {
    const segId = nid("seg");
    const segKind = s === 0 ? kind : chance(0.5) ? kind : kind === "ahu" ? "manual" : "ahu";
    if (segKind === "ahu") {
      const pickModel = weighted(AHU_MODELS, [0.2, 0.28, 0.22, 0.18, 0.12]);
      const flow = Math.round(between(pickModel.flow[0], pickModel.flow[1]) / 100) * 100;
      const segUnits = weighted([1, 2, 3, 4], [0.66, 0.22, 0.08, 0.04]);
      const hppPerUnit = flow * between(9_000, 15_000) * scale;
      const segHpp = hppPerUnit * segUnits;
      const title = `${scope.replace(/^(AHU|CRAH|FAU) /, "")} (${segUnits} unit)`;
      rows.segments.push({
        id: segId, projectId, type: "ahu", title, sortOrder: s, subtotal: 0,
        ahuModel: pickModel.model, ahuRef: `AHU-${String(s + 1).padStart(2, "0")}`, flowCMH: flow, qty: segUnits,
        dimH: int(1400, 2400), dimW: int(1200, 2600), dimD: int(2800, 6200), profileType: "AL-40x40",
        createdAt, updatedAt,
      });
      let segSub = 0;
      AHU_SECTIONS.forEach((sec, si) => {
        const secId = nid("sec");
        const secHpp = segHpp * sec.share * between(0.93, 1.07);
        let secSub = 0;
        const per = secHpp / sec.lines.length;
        sec.lines.forEach((ln, li) => {
          const qty = ln.uom === "m2" || ln.uom === "kg" || ln.uom === "m" ? int(20, 260) * segUnits : int(1, 8) * segUnits;
          const unitPrice = Math.max(100, r100(per / qty));
          const subtotal = qty * unitPrice;
          secSub += subtotal;
          rows.lineItems.push({
            id: nid("line"), sectionId: secId, sortOrder: li, description: ln.description, uom: ln.uom,
            qty, unitPrice, currency: "IDR", wasteFactor: 1, subtotal, createdAt, updatedAt,
          });
        });
        segSub += secSub;
        rows.sections.push({ id: secId, segmentId: segId, category: sec.category, sortOrder: si, subtotal: secSub, createdAt, updatedAt });
      });
      const seg = rows.segments[rows.segments.length - 1];
      seg.subtotal = segSub;
      hppTotal += segSub;
      if (flowFirst === null) {
        flowFirst = flow;
        modelFirst = pickModel.model;
        units = segUnits;
        spec = `${segUnits} unit ${pickModel.model}, ${flow.toLocaleString("id-ID")} CMH`;
      }
    } else {
      const recipe = pick(MANUAL_RECIPES);
      const f = between(0.25, 1.1) * scale;
      const title = recipe.title;
      rows.segments.push({
        id: segId, projectId, type: "manual", title, sortOrder: s, subtotal: 0, qty: 1, createdAt, updatedAt,
      });
      let segSub = 0;
      recipe.groups.forEach((g, gi) => {
        const groupId = nid("grp");
        let groupSub = 0;
        g.items.forEach((it, ii) => {
          const src = catalogPrice.get(`${it.type}:${it.code}`);
          if (!src) throw new Error(`Katalog tidak ditemukan: ${it.type}:${it.code}`);
          const qty = it.qty >= 100 ? Math.round(it.qty * f) : Math.max(1, Math.round(it.qty * f));
          const overridePrice = chance(0.1) ? r100(src.price * between(0.92, 1.05)) : null;
          const eff = overridePrice ?? src.price;
          const waste = it.waste ?? 1;
          const subtotal = qty * eff * waste;
          groupSub += subtotal;
          rows.mItems.push({
            id: nid("mit"), groupId, sortOrder: ii, sourceType: it.type, sourceId: src.id, code: src.code, name: src.name,
            category: src.category, uom: src.uom, qty, basePrice: src.price, overridePrice, effectivePrice: eff,
            wasteFactor: waste, subtotal, createdAt, updatedAt,
          });
        });
        segSub += groupSub;
        rows.groups.push({ id: groupId, segmentId: segId, name: g.name, sortOrder: gi, subtotal: groupSub, createdAt, updatedAt });
      });
      const seg = rows.segments[rows.segments.length - 1];
      seg.subtotal = segSub;
      hppTotal += segSub;
      if (s === 0) spec = `Paket ${title.toLowerCase()}`;
    }
  }

  const summary = computeCostSummary(
    hppTotal, 1, pricing,
    { esk: pricing.eskalasi !== 0, asu: pricing.asuransi !== 0, mob: pricing.mobilisasi !== 0 }
  );
  rows.projects.push({
    id: projectId, organizationId: orgId, name, status, qty: 1, ...pricing,
    totalHPP: hppTotal, totalSelling: summary.selling,
    notes: status === "draft" ? "Perhitungan awal, menunggu konfirmasi spesifikasi dari klien." : null,
    createdAt, updatedAt,
  });
  return { id: projectId, name, selling: summary.selling, hpp: hppTotal, kind, units, flow: flowFirst, model: modelFirst, spec };
}

// ---------- order-to-cash ----------

type Decided = "won" | "lost" | "sent" | "draft";

const PAYER_LAG: Record<string, [number, number]> = { fast: [-3, 3], normal: [0, 14], slow: [12, 55] };

function methodFor() {
  return weighted(["transfer", "giro", "virtual_account"], [0.75, 0.15, 0.1]);
}

function planFor(): number[] {
  return weighted([[0.5, 0.5], [0.3, 0.4, 0.3], [1]], [0.6, 0.25, 0.15]);
}

function buildOrderToCash(opts: {
  orgId: string;
  anchor: Date;
  quotation: Row & { id: string };
  customerRow: CustomerSeed;
  customerId: string;
  wonAt: Date;
  items: Array<{ projectId: string; description: string; spec: string; totalPrice: number }>;
  afterDiscRatio: number;
  perihal: string;
  kind: "ahu" | "manual";
  forceOverdue?: boolean;
}) {
  const { orgId, anchor, quotation, customerRow, customerId, wonAt, items, perihal } = opts;
  const soId = nid("so");
  const soDate = new Date(Math.min(dayStart(addDays(wonAt, int(0, 3))).getTime(), dayStart(anchor).getTime()));
  const soNumber = docNumber("SO", "SO", soDate);
  const before = items.reduce((s, i) => s + i.totalPrice, 0);
  const after = Number(quotation.totalAfterDisc);
  const ppn = Number(quotation.totalPPN);
  const grand = Number(quotation.grandTotal);

  const soItemRows = items.map((it, idx) => ({
    id: nid("soi"), soId, projectId: it.projectId, description: it.description, spec: it.spec, qty: 1, uom: "Lot",
    unitPrice: it.totalPrice, totalPrice: it.totalPrice, deliveredQty: 0, sortOrder: idx, createdAt: soDate, updatedAt: soDate,
  }));

  // deliveries
  const lead = opts.kind === "ahu" ? int(40, 85) : int(22, 50);
  const doDates: Date[] = [];
  let t = addDays(soDate, lead);
  for (let i = 0; i < soItemRows.length; i += 1) {
    if (t > anchor) break;
    doDates.push(dayStart(t));
    t = addDays(t, int(8, 26));
  }
  doDates.forEach((d, i) => {
    const doId = nid("do");
    const received = d <= addDays(anchor, -4);
    rows.deliveries.push({
      id: doId, organizationId: orgId, doNumber: docNumber("SJ", "DO", d), salesOrderId: soId, tanggal: d,
      status: received ? "received" : "sent", shippingAddress: `${customerRow.street}, ${customerRow.city}`,
      notes: null, createdAt: d, updatedAt: d,
    });
    rows.deliveryItems.push({ id: nid("dli"), doId, soItemId: soItemRows[i].id, qtyDelivered: 1, createdAt: d });
    soItemRows[i].deliveredQty = 1;
  });
  const deliveredCount = doDates.length;
  const allDelivered = deliveredCount === soItemRows.length;

  // invoices
  const plan = planFor();
  const termsLabel = ["DP", "Termin", "Pelunasan"];
  const afterTotal = after;
  const lastDelivery = doDates[doDates.length - 1] ?? null;
  const firstDelivery = doDates[0] ?? null;
  const payer = customerRow.payer;
  const invoiceStates: Array<{ paid: boolean; open: boolean }> = [];

  plan.forEach((share, idx) => {
    const isLast = idx === plan.length - 1;
    const kind = plan.length === 1 ? "final" : idx === 0 ? "dp" : isLast ? "final" : "progress";
    let invDate: Date;
    if (kind === "dp") invDate = addDays(soDate, int(1, 4));
    else if (kind === "progress") invDate = firstDelivery ?? addDays(soDate, 9999);
    else invDate = allDelivered && lastDelivery ? addDays(lastDelivery, int(1, 3)) : addDays(soDate, 9999);
    if (invDate > anchor) return;
    invDate = dayStart(invDate);

    const sub = r2(afterTotal * share);
    const ppnAmt = r2(sub * (PPN / 100));
    const gt = r2(sub + ppnAmt);
    const termDays = kind === "dp" ? 7 : weighted([14, 30], [0.5, 0.5]);
    const due = addDays(invDate, termDays);
    const [lagLo, lagHi] = PAYER_LAG[payer];
    let payDate = addDays(due, int(lagLo, lagHi));
    if (opts.forceOverdue && isLast && anchor.getTime() - invDate.getTime() < 100 * DAY) payDate = addDays(anchor, 30);

    const invId = nid("inv");
    const label = `${termsLabel[kind === "dp" ? 0 : kind === "progress" ? 1 : 2]} ${Math.round(share * 100)}% - ${perihal}`;
    const partial = payDate <= anchor && chance(0.14);
    let paidTotal = 0;
    const payRows: Array<{ date: Date; amount: number }> = [];
    if (payDate <= anchor) {
      if (partial) {
        const first = r2(gt * between(0.4, 0.7));
        payRows.push({ date: payDate, amount: first });
        const second = stale0(payDate, anchor) ? addDays(payDate, int(5, 20)) : addDays(payDate, int(10, 35));
        const stale = anchor.getTime() - payDate.getTime() > 45 * DAY;
        if (second <= anchor && (stale || chance(0.5))) payRows.push({ date: second, amount: r2(gt - first) });
      } else {
        payRows.push({ date: payDate, amount: gt });
      }
    }
    paidTotal = r2(payRows.reduce((s, p) => s + p.amount, 0));
    const status = paidTotal <= 0 ? "sent" : paidTotal + 0.01 >= gt ? "paid" : "partially_paid";

    rows.invoices.push({
      id: invId, organizationId: orgId, invNumber: docNumber("INV", "INV", invDate), salesOrderId: soId, customerId,
      tanggal: invDate, dueDate: due, kind, subtotal: sub, discountPct: 0, discountAmt: 0, dpp: sub, ppn: ppnAmt, pph: 0,
      grandTotal: gt, paidTotal, status, notes: null,
      clientName: customerRow.attn, clientCompany: customerRow.company,
      clientAddress: `${customerRow.street}, ${customerRow.city}`, clientAttn: customerRow.attn, clientPhone: String(quotation.clientPhone ?? ""),
      createdAt: invDate, updatedAt: payRows.length ? payRows[payRows.length - 1].date : invDate,
    });
    rows.invoiceItems.push({
      id: nid("ini"), invId, description: label, qty: 1, uom: "Lot", unitPrice: sub, totalPrice: sub, sortOrder: 0, createdAt: invDate,
    });
    payRows.forEach((p) => {
      const payId = nid("pay");
      rows.payments.push({
        id: payId, organizationId: orgId, payNumber: docNumber("PAY", "PAY", p.date), customerId, tanggal: p.date,
        method: methodFor(), reference: `TRF-${int(100000, 999999)}`, amount: p.amount, status: "posted", notes: null,
        createdAt: p.date, updatedAt: p.date,
      });
      rows.allocations.push({ id: nid("alc"), paymentId: payId, invoiceId: invId, amount: p.amount });
    });
    invoiceStates.push({ paid: status === "paid", open: status !== "paid" });
  });

  const fullyPaid = invoiceStates.length === plan.length && invoiceStates.every((i) => i.paid);
  const soStatus = fullyPaid && allDelivered ? "closed" : allDelivered ? "delivered" : deliveredCount > 0 ? "partially_delivered" : "open";

  rows.salesOrders.push({
    id: soId, organizationId: orgId, soNumber, quotationId: quotation.id, customerId, tanggal: soDate,
    poNumber: `PO/${soDate.getUTCFullYear()}/${customerRow.slug.slice(0, 3).toUpperCase()}/${int(100, 999)}`,
    status: soStatus, subtotal: before, discount: r2(before - after), ppn, grandTotal: grand,
    paymentTerms: quotation.paymentTerms ?? null, deliveryTerms: quotation.deliveryTerms ?? null, notes: null,
    clientName: customerRow.attn, clientCompany: customerRow.company,
    clientAddress: `${customerRow.street}, ${customerRow.city}`, clientAttn: customerRow.attn, clientPhone: String(quotation.clientPhone ?? ""),
    createdAt: soDate, updatedAt: addDays(soDate, deliveredCount ? lead : 0) > anchor ? soDate : addDays(soDate, deliveredCount ? lead : 0),
  });
  soItemRows.forEach((r) => rows.soItems.push(r));
  quotationConversions.push({ quotationId: quotation.id, soId });
  return soId;
}

// ---------- main generation ----------

function generate(orgId: string, anchor: Date, ownerName: string) {
  buildCatalog(orgId, anchor);

  const sales: SalesPerson[] = SALES.map((s, i) => (i === 0 ? { ...s, name: ownerName } : s));

  // customers
  const customerIds: string[] = [];
  CUSTOMERS.forEach((c, i) => {
    const id = `${tag}_cust_${String(i + 1).padStart(3, "0")}`;
    customerIds.push(id);
    rows.customers.push({
      id, organizationId: orgId, name: c.attn, company: c.company,
      address: `${c.street}, ${c.city}`, attn: c.attn, phone: phone(),
      email: `procurement@${c.slug}.example`,
      npwp: `${int(10, 99)}.${int(100, 999)}.${int(100, 999)}.${int(1, 9)}-${int(100, 999)}.${int(100, 999)}`,
      notes: c.payer === "slow" ? "Pembayaran biasanya melewati jatuh tempo, tindak lanjuti lebih awal." : null,
      createdAt: addDays(anchor, -int(120, 420)), updatedAt: addDays(anchor, -int(0, 60)),
    });
  });

  const stats = { won: 0, lost: 0, sent: 0, draft: 0, superseded: 0 };
  const monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 11, 1));

  for (let m = 0; m < 12; m += 1) {
    const first = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + m, 1));
    const lastDay = m === 11 ? anchor.getUTCDate() : new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const season = SEASONALITY[first.getUTCMonth()];
    const growth = 1 + 0.025 * m;

    sales.forEach((sp, si) => {
      const activity = Math.max(0.35, 1 + sp.trend * (m - 5.5));
      const monthDays = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
      const expected = 10 * sp.weight * season * growth * activity * (lastDay / monthDays);
      const count = Math.max(0, Math.round(expected + between(-0.8, 0.8)));
      for (let n = 0; n < count; n += 1) {
        const day = Math.min(lastDay, int(1, Math.max(1, lastDay)));
        const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day, 5, 0, 0));
        if (date > anchor) continue;
        const own = CUSTOMERS.map((c, ci) => ({ c, ci })).filter((x) => x.c.owner === si);
        const choice = chance(0.78) && own.length ? pick(own) : { c: pick(CUSTOMERS), ci: 0 };
        const ci = CUSTOMERS.indexOf(choice.c);
        createDeal({ orgId, anchor, sales: sp, customer: CUSTOMERS[ci], customerId: customerIds[ci], date, stats });
      }
    });
  }

  // Follow-ups that make "Hari ini" lively: quotations expiring today/tomorrow.
  const forcedOwner = sales[0];
  [0, 1, 2].forEach((k) => {
    const ci = [0, 4, 7][k];
    const date = addDays(anchor, k === 2 ? -13 : -14);
    createDeal({ orgId, anchor, sales: forcedOwner, customer: CUSTOMERS[ci], customerId: customerIds[ci], date, stats, force: "sent" });
  });
  createDeal({ orgId, anchor, sales: forcedOwner, customer: CUSTOMERS[13], customerId: customerIds[13], date: addDays(anchor, -9), stats, force: "won" });
  // Work-in-progress costing drafts without quotation.
  for (let i = 0; i < 7; i += 1) {
    const c = pick(CUSTOMERS);
    buildProject({ orgId, customer: c, date: addDays(anchor, -int(0, 12)), status: "draft" });
  }
  // A few void/draft invoices for list variety.
  const sample = rows.invoices.filter((i) => i.status === "paid").slice(0, 2);
  sample.forEach((inv, idx) => {
    const id = nid("inv");
    rows.invoices.push({
      ...inv, id, invNumber: docNumber("INV", "INV", inv.tanggal as Date), status: "void", paidTotal: 0,
      voidReason: "Salah nominal, diterbitkan ulang", createdAt: inv.tanggal, updatedAt: inv.tanggal,
    });
    rows.invoiceItems.push({ id: nid("ini"), invId: id, description: "Diterbitkan ulang karena salah nominal", qty: 1, uom: "Lot", unitPrice: inv.subtotal, totalPrice: inv.subtotal, sortOrder: 0, createdAt: inv.tanggal });
    void idx;
  });
  void FIRST_NAMES; void LAST_NAMES;
  return { stats, sales };
}

function createDeal(args: {
  orgId: string; anchor: Date; sales: SalesPerson; customer: CustomerSeed; customerId: string; date: Date;
  stats: Record<string, number>; force?: Decided;
}) {
  const { orgId, anchor, sales, customer, customerId, date, stats } = args;
  const age = Math.floor((anchor.getTime() - date.getTime()) / DAY);

  // outcome
  let outcome: Decided;
  if (args.force) outcome = args.force;
  else if (age < 12) outcome = chance(0.35) ? "draft" : "sent";
  else {
    const winP = sales.winRate;
    outcome = weighted<Decided>(["won", "lost", "sent", "draft"], [winP * 0.82, (1 - winP) * 0.55, 0.1, 0.05]);
  }
  const monthKey = periodOf(date);
  // Keep every settled month looking alive: top up months that came out thin.
  if (!args.force && age >= 45 && outcome !== "won" && (wonByMonth.get(monthKey) ?? 0) < 3 && chance(0.6)) outcome = "won";
  const kind: "ahu" | "manual" = chance(0.6) ? "ahu" : "manual";
  const projectCount = chance(0.22) ? 2 : 1;
  const plans: ProjectPlan[] = [];
  for (let i = 0; i < projectCount; i += 1) {
    plans.push(buildProject({ orgId, customer, date, status: outcome === "draft" ? "draft" : "final", kind: i === 0 ? kind : undefined, scale: between(0.8, 1.25) }));
  }

  const discountPct = chance(0.5) ? pick([2, 3, 5, 5, 7.5]) : 0;
  const totalBefore = plans.reduce((s, p) => s + p.selling, 0);
  const after = totalBefore * (1 - discountPct / 100);
  const ppnAmt = after * (PPN / 100);
  const grand = after + ppnAmt;

  const makeQuotation = (opts: { id: string; date: Date; status: string; revision: number; revisionOfId: string | null; noSurat: string }) => {
    const sentAt = ["draft"].includes(opts.status) ? null : addDays(opts.date, int(0, 2));
    let wonAt: Date | null = null;
    let lostAt: Date | null = null;
    let lostReason: string | null = null;
    if (opts.status === "won" && sentAt) wonAt = addDays(sentAt, int(6, 32));
    if (opts.status === "lost" && sentAt) {
      lostAt = addDays(sentAt, int(8, 40));
      lostReason = pick(LOST_REASONS);
    }
    return {
      id: opts.id, organizationId: orgId, projectId: plans[0].id, customerId, status: opts.status, noSurat: opts.noSurat,
      tanggal: opts.date, perihal: `Penawaran ${plans[0].name}`,
      clientName: customer.attn, clientCompany: customer.company, salesman: sales.name,
      clientAddress: `${customer.street}, ${customer.city}`, clientAttn: customer.attn, clientPhone: phone(),
      projectLocation: customer.city, ourRef: `SDN/${sales.slug.toUpperCase()}/${periodOf(opts.date)}`, yourRef: chance(0.6) ? `RFQ/${int(100, 999)}/${opts.date.getUTCFullYear()}` : null,
      discount: discountPct, discountEnabled: discountPct > 0, ppn: PPN, ppnEnabled: true,
      totalBeforeDisc: totalBefore, totalAfterDisc: after, totalPPN: ppnAmt, totalPPH: 0, grandTotal: grand,
      paymentTerms: pick(PAYMENT_TERMS), deliveryTerms: "Ex-work Cikarang", warrantyTerms: "12 bulan sejak pengiriman",
      validityDays: 14, introText: null, notes: null,
      sentAt, wonAt, lostAt, lostReason, revision: opts.revision, revisionOfId: opts.revisionOfId,
      createdAt: opts.date, updatedAt: wonAt ?? lostAt ?? sentAt ?? opts.date,
    };
  };

  const addItems = (quotationId: string) => {
    plans.forEach((p, idx) => {
      rows.quotationItems.push({
        id: nid("qi"), quotationId, projectId: p.id, sortOrder: idx, description: p.name, spec: p.spec, qty: 1, uom: "Lot",
        unitPrice: p.selling, totalPrice: p.selling, createdAt: date, updatedAt: date,
      });
    });
  };

  // revisions: the original is superseded, the revision carries the outcome.
  const revised = !args.force && outcome !== "draft" && age > 20 && chance(0.12);
  const originalId = nid("quo");
  const firstDate = revised ? addDays(date, -int(6, 15)) : date;
  const firstStatus = revised ? "superseded" : outcome;
  const original = makeQuotation({ id: originalId, date: firstDate, status: firstStatus, revision: 0, revisionOfId: null, noSurat: docNumber("QT", "QUO", firstDate) });
  if (revised) original.sentAt = addDays(firstDate, 1);
  rows.quotations.push(original);
  addItems(originalId);
  if (revised) stats.superseded += 1;

  let outcomeQuote = original;
  if (revised) {
    const revId = nid("quo");
    const rev = makeQuotation({ id: revId, date, status: outcome, revision: 1, revisionOfId: originalId, noSurat: `${original.noSurat} Rev.1` });
    rows.revisions.push(rev);
    addItems(revId);
    outcomeQuote = rev;
  }
  stats[outcome] += 1;
  if (outcome === "won") wonByMonth.set(monthKey, (wonByMonth.get(monthKey) ?? 0) + 1);

  if (outcome === "won" && outcomeQuote.wonAt) {
    // A won date beyond today means it is still being negotiated.
    const thisMonth = periodOf(date) === periodOf(anchor);
    if (outcomeQuote.wonAt > anchor && thisMonth && age >= 8 && (args.force === "won" || (currentMonthWins < 3 && chance(0.7)))) {
      // Closed early in the current month so "booked this month" is never empty.
      outcomeQuote.wonAt = addDays(anchor, -int(1, 3));
      outcomeQuote.updatedAt = outcomeQuote.wonAt;
      currentMonthWins += 1;
    }
    if (outcomeQuote.wonAt > anchor) {
      outcomeQuote.status = "sent";
      outcomeQuote.wonAt = null;
      stats.won -= 1;
      stats.sent += 1;
      return;
    }
    buildOrderToCash({
      orgId, anchor, quotation: outcomeQuote, customerRow: customer, customerId, wonAt: outcomeQuote.wonAt,
      items: plans.map((p) => ({ projectId: p.id, description: p.name, spec: p.spec, totalPrice: p.selling })),
      afterDiscRatio: after / totalBefore, perihal: String(outcomeQuote.perihal), kind: plans[0].kind,
      forceOverdue: chance(0.08),
    });
  }
  if (outcome === "lost" && outcomeQuote.lostAt && outcomeQuote.lostAt > anchor) {
    outcomeQuote.status = "sent";
    outcomeQuote.lostAt = null;
    outcomeQuote.lostReason = null;
    stats.lost -= 1;
    stats.sent += 1;
  }
}

// ---------- database I/O ----------

export async function wipeBusinessData(orgId: string) {
  const where = { organizationId: orgId };
  await prisma.paymentAllocation.deleteMany({ where: { payment: where } });
  await prisma.payment.deleteMany({ where });
  await prisma.invoice.deleteMany({ where });
  await prisma.deliveryOrder.deleteMany({ where });
  await prisma.quotation.updateMany({ where, data: { convertedSoId: null, revisionOfId: null } });
  await prisma.salesOrder.deleteMany({ where });
  await prisma.quotation.deleteMany({ where });
  await prisma.costingProject.deleteMany({ where });
  await prisma.customer.deleteMany({ where });
  await prisma.documentSequence.deleteMany({ where });
  await prisma.materialPrice.deleteMany({ where });
  await prisma.profileData.deleteMany({ where });
  await prisma.componentCatalog.deleteMany({ where });
}

async function insert(label: string, data: Row[], create: (batch: never) => Promise<unknown>) {
  const size = 1000;
  for (let i = 0; i < data.length; i += size) await create(data.slice(i, i + size) as never);
  void label;
}

function resetState() {
  for (const list of Object.values(rows)) list.length = 0;
  quotationConversions.length = 0;
  seqCounts.clear();
  wonByMonth.clear();
  currentMonthWins = 0;
  idCounter = 0;
  materialIds.clear();
  profileIds.clear();
  componentIds.clear();
  catalogPrice.clear();
  rand = mulberry32(SEED);
}

/** Id prefix used for one organization's generated rows and fake salespeople. */
export function demoTagFor(orgId: string): string {
  return `d${orgId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toLowerCase()}`;
}

/** Remove all business data plus the fake salespeople the generator added. */
export async function clearDemoData(orgId: string) {
  await wipeBusinessData(orgId);
  await prisma.organizationMember.deleteMany({
    where: { organizationId: orgId, userId: { startsWith: `${demoTagFor(orgId)}_sales_` } },
  });
}

export type SeedDemoOptions = {
  anchor?: Date;
  /** Clerk user id of the person who owns the data; keeps their own role. */
  ownerUserId: string;
  /** Display name used as the top salesperson so the personal dashboard fills in. */
  ownerName?: string;
  /** Role given to the owner's membership row. */
  ownerRole?: string;
  /** Read-only "ceo" members to add. */
  viewerUserIds?: string[];
  /** Id prefix; defaults to one derived from the org id. */
  idTag?: string;
  log?: (msg: string) => void;
};

/**
 * Replace the organization's business data with generated demo data.
 * The organization row itself (name, settings, plan) is NOT touched.
 */
export async function seedDemoData(orgId: string, opts: SeedDemoOptions) {
  const log = opts.log ?? (() => undefined);
  const anchor = opts.anchor ?? todayAnchor();
  const ownerName = opts.ownerName?.trim() || SALES[0].name;
  const ownerRole = opts.ownerRole ?? "owner";
  const viewers = opts.viewerUserIds ?? [];

  resetState();
  tag = opts.idTag ?? demoTagFor(orgId);

  await wipeBusinessData(orgId);
  await ensureDefaultFolders(orgId);

  const { stats, sales } = generate(orgId, anchor, ownerName);

  // members: salespeople with targets, owner, read-only viewers
  for (let i = 0; i < sales.length; i += 1) {
    const userId = i === 0 ? opts.ownerUserId : `${tag}_sales_${SALES[i].slug}`;
    const role = i === 0 ? ownerRole : "sales";
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      create: { organizationId: orgId, userId, role, monthlyTarget: SALES[i].target },
      update: { monthlyTarget: SALES[i].target },
    });
  }
  for (const userId of viewers) {
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      create: { organizationId: orgId, userId, role: "ceo" },
      update: {},
    });
  }

  // Nothing recorded may be dated after "today" (due dates are the only future dates).
  const stamped = ["createdAt", "updatedAt", "sentAt", "wonAt", "lostAt", "tanggal"];
  for (const list of Object.values(rows)) {
    for (const r of list) for (const k of stamped) if (r[k] instanceof Date && (r[k] as Date) > anchor) r[k] = anchor;
  }

  log("Menulis data…");
  await insert("material", rows.materials, (d) => prisma.materialPrice.createMany({ data: d }));
  await insert("profil", rows.profiles, (d) => prisma.profileData.createMany({ data: d }));
  await insert("komponen", rows.components, (d) => prisma.componentCatalog.createMany({ data: d }));
  await insert("pelanggan", rows.customers, (d) => prisma.customer.createMany({ data: d }));
  await insert("proyek costing", rows.projects, (d) => prisma.costingProject.createMany({ data: d }));
  await insert("item (segmen)", rows.segments, (d) => prisma.costingSegment.createMany({ data: d }));
  await insert("seksi AHU", rows.sections, (d) => prisma.costingSection.createMany({ data: d }));
  await insert("baris AHU", rows.lineItems, (d) => prisma.costingLineItem.createMany({ data: d }));
  await insert("grup manual", rows.groups, (d) => prisma.manualCostingGroup.createMany({ data: d }));
  await insert("item manual", rows.mItems, (d) => prisma.manualCostingItem.createMany({ data: d }));
  await insert("quotation", rows.quotations, (d) => prisma.quotation.createMany({ data: d }));
  await insert("quotation revisi", rows.revisions, (d) => prisma.quotation.createMany({ data: d }));
  await insert("item quotation", rows.quotationItems, (d) => prisma.quotationItem.createMany({ data: d }));
  await insert("sales order", rows.salesOrders, (d) => prisma.salesOrder.createMany({ data: d }));
  await insert("item SO", rows.soItems, (d) => prisma.salesOrderItem.createMany({ data: d }));
  await insert("surat jalan", rows.deliveries, (d) => prisma.deliveryOrder.createMany({ data: d }));
  await insert("item surat jalan", rows.deliveryItems, (d) => prisma.deliveryItem.createMany({ data: d }));
  await insert("invoice", rows.invoices, (d) => prisma.invoice.createMany({ data: d }));
  await insert("item invoice", rows.invoiceItems, (d) => prisma.invoiceItem.createMany({ data: d }));
  await insert("pembayaran", rows.payments, (d) => prisma.payment.createMany({ data: d }));
  await insert("alokasi", rows.allocations, (d) => prisma.paymentAllocation.createMany({ data: d }));

  for (const c of quotationConversions) {
    await prisma.quotation.update({ where: { id: c.quotationId }, data: { convertedSoId: c.soId } });
  }

  const seq = [...seqCounts.entries()].map(([key, lastNumber]) => {
    const [docType, period] = key.split(":");
    return { organizationId: orgId, docType, period, lastNumber };
  });
  await prisma.documentSequence.createMany({ data: seq });

  log(`Statistik quotation: ${JSON.stringify(stats)}`);
  return stats;
}
