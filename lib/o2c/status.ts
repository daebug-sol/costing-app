/** Centralized O2C status constants and transition validation. */

export const DOC_TYPES = {
  QUO: "QUO",
  SO: "SO",
  DO: "DO",
  INV: "INV",
  PAY: "PAY",
} as const;

export type DocType = (typeof DOC_TYPES)[keyof typeof DOC_TYPES];

export const QUOTATION_STATUS = {
  DRAFT: "draft",
  SENT: "sent",
  WON: "won",
  LOST: "lost",
  SUPERSEDED: "superseded",
  /** Legacy — treated as won for dashboard compatibility */
  APPROVED: "approved",
  FINALIZED: "finalized",
  FINAL: "final",
} as const;

export const SO_STATUS = {
  OPEN: "open",
  PARTIALLY_DELIVERED: "partially_delivered",
  DELIVERED: "delivered",
  CLOSED: "closed",
  CANCELLED: "cancelled",
} as const;

export const DO_STATUS = {
  DRAFT: "draft",
  SENT: "sent",
  RECEIVED: "received",
} as const;

export const INVOICE_STATUS = {
  DRAFT: "draft",
  SENT: "sent",
  PARTIALLY_PAID: "partially_paid",
  PAID: "paid",
  VOID: "void",
} as const;

export const INVOICE_KIND = {
  DP: "dp",
  PROGRESS: "progress",
  FINAL: "final",
} as const;

export const PAYMENT_STATUS = {
  POSTED: "posted",
  VOID: "void",
} as const;

const QUOTATION_TRANSITIONS: Record<string, readonly string[]> = {
  [QUOTATION_STATUS.DRAFT]: [
    QUOTATION_STATUS.SENT,
    QUOTATION_STATUS.WON,
    QUOTATION_STATUS.LOST,
    QUOTATION_STATUS.APPROVED,
    QUOTATION_STATUS.FINALIZED,
  ],
  [QUOTATION_STATUS.SENT]: [
    QUOTATION_STATUS.WON,
    QUOTATION_STATUS.LOST,
    QUOTATION_STATUS.DRAFT,
    QUOTATION_STATUS.APPROVED,
  ],
  [QUOTATION_STATUS.WON]: [QUOTATION_STATUS.SUPERSEDED],
  [QUOTATION_STATUS.LOST]: [QUOTATION_STATUS.DRAFT],
  [QUOTATION_STATUS.APPROVED]: [QUOTATION_STATUS.WON, QUOTATION_STATUS.SUPERSEDED],
  [QUOTATION_STATUS.FINALIZED]: [QUOTATION_STATUS.WON, QUOTATION_STATUS.SUPERSEDED],
  [QUOTATION_STATUS.FINAL]: [QUOTATION_STATUS.WON, QUOTATION_STATUS.SENT],
  [QUOTATION_STATUS.SUPERSEDED]: [],
};

/** Normalize legacy statuses toward the O2C vocabulary. */
export function normalizeQuotationStatus(raw: string | null | undefined): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return QUOTATION_STATUS.DRAFT;
  if (s === "final" || s === "finalised" || s === "finalized") {
    return QUOTATION_STATUS.FINALIZED;
  }
  if (s === "approve") return QUOTATION_STATUS.APPROVED;
  return s;
}

/** Won for funnel / convert eligibility (includes legacy approved/finalized). */
export function isWonLikeQuotationStatus(raw: string | null | undefined): boolean {
  const s = normalizeQuotationStatus(raw);
  return (
    s === QUOTATION_STATUS.WON ||
    s === QUOTATION_STATUS.APPROVED ||
    s === QUOTATION_STATUS.FINALIZED
  );
}

export function canTransitionQuotation(
  from: string | null | undefined,
  to: string
): boolean {
  const fromN = normalizeQuotationStatus(from);
  const toN = normalizeQuotationStatus(to);
  if (fromN === toN) return true;
  const allowed = QUOTATION_TRANSITIONS[fromN];
  if (!allowed) return false;
  return allowed.includes(toN);
}

export function quotationStatusLabel(raw: string | null | undefined): string {
  const s = normalizeQuotationStatus(raw);
  const labels: Record<string, string> = {
    draft: "Draft",
    sent: "Terkirim",
    won: "Menang",
    lost: "Kalah",
    superseded: "Digantikan",
    approved: "Disetujui",
    finalized: "Final",
  };
  return labels[s] ?? s;
}

export function soStatusLabel(raw: string | null | undefined): string {
  const s = (raw ?? "").trim().toLowerCase();
  const labels: Record<string, string> = {
    open: "Terbuka",
    partially_delivered: "Sebagian dikirim",
    delivered: "Terkirim",
    closed: "Ditutup",
    cancelled: "Dibatalkan",
  };
  return labels[s] ?? s;
}

export function invoiceStatusLabel(raw: string | null | undefined): string {
  const s = (raw ?? "").trim().toLowerCase();
  const labels: Record<string, string> = {
    draft: "Draft",
    sent: "Terkirim",
    partially_paid: "Sebagian dibayar",
    paid: "Lunas",
    void: "Void",
  };
  return labels[s] ?? s;
}
