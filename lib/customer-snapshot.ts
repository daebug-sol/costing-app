/** Helpers to copy Customer master → denormalized document snapshot fields. */

export type CustomerLike = {
  name: string;
  company: string;
  address: string;
  attn: string;
  phone: string;
};

export type ClientSnapshot = {
  clientName: string | null;
  clientCompany: string | null;
  clientAddress: string | null;
  clientAttn: string | null;
  clientPhone: string | null;
};

export function customerToSnapshot(c: CustomerLike): ClientSnapshot {
  return {
    clientName: c.name?.trim() || null,
    clientCompany: c.company?.trim() || null,
    clientAddress: c.address?.trim() || null,
    clientAttn: c.attn?.trim() || null,
    clientPhone: c.phone?.trim() || null,
  };
}

/** Normalize for backfill matching (case/trim). */
export function normalizeCustomerKey(
  name: string | null | undefined,
  company: string | null | undefined
): string {
  const n = (name ?? "").trim().toLowerCase();
  const c = (company ?? "").trim().toLowerCase();
  return `${n}|${c}`;
}
