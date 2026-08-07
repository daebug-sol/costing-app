import { finite } from "@/lib/calculations";
import {
  DO_STATUS,
  INVOICE_STATUS,
  SO_STATUS,
  isWonLikeQuotationStatus,
  invoiceStatusLabel,
  quotationStatusLabel,
  soStatusLabel,
} from "@/lib/o2c/status";

export type O2CStage =
  | "quotation"
  | "sales-order"
  | "delivery"
  | "invoice"
  | "payment";

export type O2CStageState = "done" | "current" | "todo";

export type O2CStageProgress = {
  stage: O2CStage;
  state: O2CStageState;
  refId?: string;
  href?: string;
  label: string;
};

export type ProjectProgress = {
  stages: O2CStageProgress[];
  latestStage: O2CStage;
  latestRefId: string;
};

export type QuotationProgressDelivery = {
  id: string;
  doNumber?: string | null;
  status: string;
};

export type QuotationProgressInvoice = {
  id: string;
  invNumber?: string | null;
  status: string;
  grandTotal: number;
  paidTotal: number;
  dueDate?: Date | string | null;
};

export type QuotationProgressSalesOrder = {
  id: string;
  soNumber?: string | null;
  status: string;
  grandTotal?: number;
  deliveries?: QuotationProgressDelivery[] | null;
  invoices?: QuotationProgressInvoice[] | null;
};

/** Quotation row with optional O2C chain (from `?view=documents`). */
export type QuotationWithChain = {
  id: string;
  status?: string | null;
  noSurat?: string | null;
  convertedSoId?: string | null;
  customerId?: string | null;
  customer?: { id: string; name?: string | null; company?: string | null } | null;
  convertedSo?: QuotationProgressSalesOrder | null;
};

const STAGE_ORDER: readonly O2CStage[] = [
  "quotation",
  "sales-order",
  "delivery",
  "invoice",
  "payment",
] as const;

const STAGE_LABELS: Record<O2CStage, string> = {
  quotation: "Penawaran",
  "sales-order": "Sales Order",
  delivery: "Surat Jalan",
  invoice: "Invoice",
  payment: "Pembayaran",
};

function norm(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

function isDoDelivered(status: string | null | undefined): boolean {
  const s = norm(status);
  return s === DO_STATUS.SENT || s === DO_STATUS.RECEIVED;
}

function isInvoiceActive(status: string | null | undefined): boolean {
  const s = norm(status);
  return s !== INVOICE_STATUS.DRAFT && s !== INVOICE_STATUS.VOID;
}

function isInvoiceVoid(status: string | null | undefined): boolean {
  return norm(status) === INVOICE_STATUS.VOID;
}

/** Same tolerance as `invoiceStatusFromPaid`. */
function isInvoiceFullyPaid(grandTotal: number, paidTotal: number): boolean {
  return finite(paidTotal, 0) + 0.01 >= finite(grandTotal, 0);
}

function doStatusLabel(raw: string | null | undefined): string {
  const s = norm(raw);
  const labels: Record<string, string> = {
    draft: "Draft",
    sent: "Terkirim",
    received: "Diterima",
  };
  return labels[s] ?? s;
}

function withDocLabel(
  stage: O2CStage,
  docNumber?: string | null,
  statusHint?: string | null
): string {
  const base = STAGE_LABELS[stage];
  const num = (docNumber ?? "").trim();
  const hint = (statusHint ?? "").trim();
  if (num && hint) return `${base} · ${num} · ${hint}`;
  if (num) return `${base} · ${num}`;
  if (hint) return `${base} · ${hint}`;
  return base;
}

function pickLatestDelivery(
  deliveries: QuotationProgressDelivery[]
): QuotationProgressDelivery | undefined {
  const delivered = deliveries.filter((d) => isDoDelivered(d.status));
  const pool = delivered.length > 0 ? delivered : deliveries;
  return pool[pool.length - 1];
}

function pickLatestInvoice(
  invoices: QuotationProgressInvoice[]
): QuotationProgressInvoice | undefined {
  const active = invoices.filter((i) => isInvoiceActive(i.status));
  if (active.length > 0) return active[active.length - 1];
  const nonVoid = invoices.filter((i) => !isInvoiceVoid(i.status));
  return nonVoid[nonVoid.length - 1];
}

function paymentStatusHint(
  activeInvoices: QuotationProgressInvoice[],
  paymentDone: boolean
): string | undefined {
  if (paymentDone) return "Lunas";
  if (activeInvoices.length === 0) return undefined;
  const anyPartial = activeInvoices.some(
    (i) =>
      finite(i.paidTotal, 0) > 0 &&
      !isInvoiceFullyPaid(i.grandTotal, i.paidTotal)
  );
  if (anyPartial) return invoiceStatusLabel(INVOICE_STATUS.PARTIALLY_PAID);
  const allPaid = activeInvoices.every((i) =>
    isInvoiceFullyPaid(i.grandTotal, i.paidTotal)
  );
  if (allPaid) return invoiceStatusLabel(INVOICE_STATUS.PAID);
  return invoiceStatusLabel(INVOICE_STATUS.SENT);
}

export function documentationHref(quotationId: string): string {
  return `/documentation?id=${encodeURIComponent(quotationId)}`;
}

export function salesOrderHref(soId: string): string {
  return `/sales-orders?id=${encodeURIComponent(soId)}`;
}

export function invoiceHref(invoiceId: string): string {
  return `/invoices?id=${encodeURIComponent(invoiceId)}`;
}

export function paymentHref(customerId: string): string {
  return `/payments?customerId=${encodeURIComponent(customerId)}`;
}

/**
 * Derive O2C progress for a quotation (+ optional SO/DO/INV chain).
 * Stages are sequential: first incomplete is `current`, earlier `done`, later `todo`.
 */
export function computeProjectProgress(quotation: QuotationWithChain): ProjectProgress {
  const so = quotation.convertedSo ?? null;
  const soId = so?.id ?? quotation.convertedSoId ?? null;
  const soCancelled = so != null && norm(so.status) === SO_STATUS.CANCELLED;
  const deliveries = so?.deliveries ?? [];
  const invoices = so?.invoices ?? [];
  const customerId = quotation.customer?.id ?? quotation.customerId ?? null;

  const quotationDone =
    Boolean(soId) || isWonLikeQuotationStatus(quotation.status);

  /** SO exists and is not cancelled. */
  const salesOrderDone = Boolean(soId) && !soCancelled;

  const latestDo = pickLatestDelivery(deliveries);
  const deliveryDone = deliveries.some((d) => isDoDelivered(d.status));

  const activeInvoices = invoices.filter((i) => isInvoiceActive(i.status));
  const invoiceDone = activeInvoices.length > 0;
  const latestInv = pickLatestInvoice(invoices);

  const nonVoidInvoices = invoices.filter((i) => !isInvoiceVoid(i.status));
  const paymentDone =
    nonVoidInvoices.length > 0 &&
    nonVoidInvoices.every((i) => isInvoiceFullyPaid(i.grandTotal, i.paidTotal));

  const doneFlags: Record<O2CStage, boolean> = {
    quotation: quotationDone,
    "sales-order": salesOrderDone,
    delivery: deliveryDone,
    invoice: invoiceDone,
    payment: paymentDone,
  };

  // Sequential progress bar: later stages stay incomplete until earlier ones finish.
  let blocked = false;
  for (const stage of STAGE_ORDER) {
    if (blocked) {
      doneFlags[stage] = false;
      continue;
    }
    if (!doneFlags[stage]) blocked = true;
  }

  const firstIncomplete = STAGE_ORDER.find((s) => !doneFlags[s]) ?? null;

  const refs: Record<
    O2CStage,
    { refId?: string; href?: string; label: string }
  > = {
    quotation: {
      refId: quotation.id,
      href: documentationHref(quotation.id),
      label: withDocLabel(
        "quotation",
        quotation.noSurat,
        quotationStatusLabel(quotation.status)
      ),
    },
    "sales-order": {
      refId: soId ?? undefined,
      href: soId ? salesOrderHref(soId) : undefined,
      label: withDocLabel(
        "sales-order",
        so?.soNumber,
        so ? soStatusLabel(so.status) : undefined
      ),
    },
    delivery: {
      refId: latestDo?.id,
      href: soId ? salesOrderHref(soId) : undefined,
      label: withDocLabel(
        "delivery",
        latestDo?.doNumber,
        latestDo ? doStatusLabel(latestDo.status) : undefined
      ),
    },
    invoice: {
      refId: latestInv?.id,
      href:
        latestInv && !isInvoiceVoid(latestInv.status)
          ? invoiceHref(latestInv.id)
          : undefined,
      label: withDocLabel(
        "invoice",
        latestInv?.invNumber,
        latestInv ? invoiceStatusLabel(latestInv.status) : undefined
      ),
    },
    payment: {
      refId: customerId ?? latestInv?.id,
      href:
        invoiceDone || paymentDone
          ? customerId
            ? paymentHref(customerId)
            : latestInv
              ? invoiceHref(latestInv.id)
              : undefined
          : undefined,
      label: withDocLabel(
        "payment",
        undefined,
        paymentStatusHint(activeInvoices, paymentDone)
      ),
    },
  };

  const stages: O2CStageProgress[] = STAGE_ORDER.map((stage) => {
    let state: O2CStageState;
    if (doneFlags[stage]) state = "done";
    else if (firstIncomplete === stage) state = "current";
    else state = "todo";

    const meta = refs[stage];
    const out: O2CStageProgress = {
      stage,
      state,
      label: meta.label,
    };
    if (meta.refId) out.refId = meta.refId;
    if (meta.href) out.href = meta.href;
    return out;
  });

  // Furthest reached stage for row-click navigation.
  let latestStage: O2CStage = "quotation";
  for (const stage of STAGE_ORDER) {
    if (doneFlags[stage]) {
      latestStage = stage;
      continue;
    }
    if (stage === firstIncomplete) {
      const hasDoc =
        stage === "quotation" ||
        (stage === "sales-order" && salesOrderDone) ||
        (stage === "delivery" && deliveries.length > 0) ||
        (stage === "invoice" && nonVoidInvoices.length > 0) ||
        (stage === "payment" && invoiceDone);
      if (hasDoc) latestStage = stage;
    }
    break;
  }

  const latestRefId = refs[latestStage].refId ?? quotation.id;

  return { stages, latestStage, latestRefId };
}
