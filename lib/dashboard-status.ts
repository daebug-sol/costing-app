const STATUS_ALIASES: Record<string, string> = {
  approve: "approved",
  approved: "approved",
  final: "finalized",
  finalized: "finalized",
  finalise: "finalized",
  finalised: "finalized",
  draft: "draft",
  sent: "sent",
  won: "won",
  lost: "lost",
  superseded: "superseded",
};

const STATUS_LABELS: Record<string, string> = {
  approved: "approved",
  finalized: "finalized",
  draft: "draft",
  sent: "sent",
  won: "won",
  lost: "lost",
  superseded: "superseded",
};

/** Booked quotation statuses — won + legacy approved/finalized during transition. */
export const BOOKED_QUOTATION_STATUSES = new Set([
  "approved",
  "finalized",
  "won",
]);
export const POTENTIAL_QUOTATION_STATUSES = new Set(["draft", "sent"]);

export function normalizeStatus(rawStatus: string | null | undefined): string {
  const lowered = (rawStatus ?? "").trim().toLowerCase();
  if (!lowered) return "unknown";
  return STATUS_ALIASES[lowered] ?? lowered;
}

export function statusLabel(normalizedStatus: string): string {
  return STATUS_LABELS[normalizedStatus] ?? normalizedStatus;
}

export function isBookedQuotationStatus(rawStatus: string | null | undefined): boolean {
  return BOOKED_QUOTATION_STATUSES.has(normalizeStatus(rawStatus));
}

export function isPotentialQuotationStatus(rawStatus: string | null | undefined): boolean {
  return POTENTIAL_QUOTATION_STATUSES.has(normalizeStatus(rawStatus));
}

export function isWonQuotationStatus(rawStatus: string | null | undefined): boolean {
  const s = normalizeStatus(rawStatus);
  return s === "won" || s === "approved" || s === "finalized";
}

export function isLostQuotationStatus(rawStatus: string | null | undefined): boolean {
  return normalizeStatus(rawStatus) === "lost";
}
