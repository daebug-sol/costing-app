import { SO_STATUS } from "@/lib/o2c/status";

export type SoItemQty = {
  qty: number;
  deliveredQty: number;
};

/**
 * Derive SO delivery status from item quantities.
 * Does not change closed/cancelled.
 */
export function deriveSoStatusFromDelivered(
  items: SoItemQty[],
  currentStatus: string
): string {
  const cur = (currentStatus ?? "").trim().toLowerCase();
  if (cur === SO_STATUS.CLOSED || cur === SO_STATUS.CANCELLED) {
    return cur;
  }
  if (items.length === 0) return SO_STATUS.OPEN;

  let anyDelivered = false;
  let allDelivered = true;
  for (const it of items) {
    const qty = Number(it.qty) || 0;
    const delivered = Number(it.deliveredQty) || 0;
    if (delivered > 0) anyDelivered = true;
    if (delivered + 1e-9 < qty) allDelivered = false;
  }

  if (allDelivered && anyDelivered) return SO_STATUS.DELIVERED;
  if (anyDelivered) return SO_STATUS.PARTIALLY_DELIVERED;
  return SO_STATUS.OPEN;
}

export function remainingQty(qty: number, deliveredQty: number): number {
  return Math.max(0, (Number(qty) || 0) - (Number(deliveredQty) || 0));
}

/** Validate proposed delivery lines against remaining qty. */
export function validateDeliveryQtys(
  soItems: Array<{ id: string; qty: number; deliveredQty: number }>,
  lines: Array<{ soItemId: string; qtyDelivered: number }>
): { ok: true } | { ok: false; error: string } {
  const byId = new Map(soItems.map((i) => [i.id, i]));
  for (const line of lines) {
    const item = byId.get(line.soItemId);
    if (!item) {
      return { ok: false, error: `Item SO tidak ditemukan: ${line.soItemId}` };
    }
    const qty = Number(line.qtyDelivered);
    if (!Number.isFinite(qty) || qty <= 0) {
      return { ok: false, error: "Qty kirim harus lebih dari 0" };
    }
    const rem = remainingQty(item.qty, item.deliveredQty);
    if (qty > rem + 1e-9) {
      return {
        ok: false,
        error: `Qty kirim melebihi sisa untuk item (${rem})`,
      };
    }
  }
  return { ok: true };
}
