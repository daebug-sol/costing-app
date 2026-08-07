import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { nextDocumentNumber } from "@/lib/doc-numbering";
import { customerToSnapshot } from "@/lib/customer-snapshot";
import {
  DOC_TYPES,
  QUOTATION_STATUS,
  SO_STATUS,
  isWonLikeQuotationStatus,
} from "@/lib/o2c/status";

type Tx = Prisma.TransactionClient;

export type ConvertResult =
  | { ok: true; salesOrderId: string; soNumber: string }
  | { ok: false; error: string; status?: number };

/**
 * Convert a won (or won-like) quotation into a Sales Order atomically.
 * Snapshots prices from quotation items — no costing recalc.
 */
export async function convertQuotationToSo(
  tx: Tx,
  orgId: string,
  quotationId: string,
  opts?: { poNumber?: string | null; forceWon?: boolean }
): Promise<ConvertResult> {
  const q = await tx.quotation.findFirst({
    where: { id: quotationId, organizationId: orgId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      customer: true,
    },
  });
  if (!q) return { ok: false, error: "Quotation tidak ditemukan", status: 404 };
  if (q.convertedSoId) {
    return {
      ok: false,
      error: "Quotation sudah dikonversi ke Sales Order",
      status: 409,
    };
  }
  if (q.status === QUOTATION_STATUS.SUPERSEDED) {
    return { ok: false, error: "Quotation sudah digantikan revisi", status: 400 };
  }
  if (!isWonLikeQuotationStatus(q.status) && !opts?.forceWon) {
    return {
      ok: false,
      error: "Hanya quotation menang (won/approved) yang dapat dikonversi",
      status: 400,
    };
  }
  if (q.items.length === 0) {
    return { ok: false, error: "Quotation tidak punya item", status: 400 };
  }

  let customerId = q.customerId;
  if (!customerId) {
    const name = (q.clientName ?? q.clientCompany ?? "Pelanggan").trim();
    const customer = await tx.customer.create({
      data: {
        organizationId: orgId,
        name,
        company: (q.clientCompany ?? "").trim(),
        address: (q.clientAddress ?? "").trim(),
        attn: (q.clientAttn ?? "").trim(),
        phone: (q.clientPhone ?? "").trim(),
      },
    });
    customerId = customer.id;
  }

  const customer = await tx.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
  });
  if (!customer) {
    return { ok: false, error: "Customer tidak ditemukan", status: 404 };
  }

  const snapshot = customerToSnapshot(customer);
  const soNumber = await nextDocumentNumber(DOC_TYPES.SO, orgId, tx);

  const discountAmt =
    q.discountEnabled !== false
      ? (q.totalBeforeDisc - q.totalAfterDisc)
      : 0;

  const soId = randomUUID();
  await tx.salesOrder.create({
    data: {
      id: soId,
      organizationId: orgId,
      soNumber,
      quotationId: q.id,
      customerId,
      tanggal: new Date(),
      poNumber: opts?.poNumber?.trim() || null,
      status: SO_STATUS.OPEN,
      subtotal: q.totalBeforeDisc,
      discount: Math.max(0, discountAmt),
      ppn: q.totalPPN,
      grandTotal: q.grandTotal,
      paymentTerms: q.paymentTerms,
      deliveryTerms: q.deliveryTerms,
      notes: q.notes,
      clientName: snapshot.clientName ?? q.clientName,
      clientCompany: snapshot.clientCompany ?? q.clientCompany,
      clientAddress: snapshot.clientAddress ?? q.clientAddress,
      clientAttn: snapshot.clientAttn ?? q.clientAttn,
      clientPhone: snapshot.clientPhone ?? q.clientPhone,
      items: {
        create: q.items.map((it, idx) => ({
          id: randomUUID(),
          quotationItemId: it.id,
          projectId: it.projectId,
          description: it.description,
          spec: it.spec,
          qty: it.qty,
          uom: it.uom,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          deliveredQty: 0,
          sortOrder: it.sortOrder ?? idx,
        })),
      },
    },
  });

  await tx.quotation.update({
    where: { id: q.id },
    data: {
      customerId,
      convertedSoId: soId,
      status: QUOTATION_STATUS.WON,
      wonAt: q.wonAt ?? new Date(),
    },
  });

  return { ok: true, salesOrderId: soId, soNumber };
}
