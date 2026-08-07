import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { nextDocumentNumber } from "@/lib/doc-numbering";
import { computeInvoiceTotals } from "@/lib/o2c/invoice-totals";
import { DOC_TYPES, INVOICE_STATUS } from "@/lib/o2c/status";
import { prisma } from "@/lib/prisma";
import { requireInvoiceInOrg } from "@/lib/tenant-context";
import { tenantWhere } from "@/lib/tenant-queries";

type Ctx = { params: Promise<{ id: string }> };

const fullInclude = {
  items: { orderBy: { sortOrder: "asc" as const } },
  customer: true,
  salesOrder: { select: { id: true, soNumber: true } },
  allocations: {
    include: { payment: { select: { id: true, payNumber: true, tanggal: true } } },
  },
} as const;

export async function GET(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requireInvoiceInOrg(id, orgId);
    if (!check.ok) return check.response;

    const row = await prisma.invoice.findFirst({
      where: tenantWhere.invoice(orgId, id),
      include: fullInclude,
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal memuat invoice" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requireInvoiceInOrg(id, orgId);
    if (!check.ok) return check.response;

    const existing = await prisma.invoice.findFirst({
      where: tenantWhere.invoice(orgId, id),
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "send") {
      if (existing.status !== INVOICE_STATUS.DRAFT) {
        return NextResponse.json(
          { error: "Hanya draft yang dapat dikirim" },
          { status: 400 }
        );
      }
      const updated = await prisma.$transaction(async (tx) => {
        let invNumber = existing.invNumber;
        if (!invNumber) {
          invNumber = await nextDocumentNumber(DOC_TYPES.INV, orgId, tx);
        }
        return tx.invoice.update({
          where: { id },
          data: { status: INVOICE_STATUS.SENT, invNumber },
          include: fullInclude,
        });
      });
      return NextResponse.json(updated);
    }

    if (body.action === "void") {
      if (existing.status === INVOICE_STATUS.VOID) {
        return NextResponse.json(existing);
      }
      if (existing.paidTotal > 0) {
        return NextResponse.json(
          { error: "Invoice yang sudah dibayar tidak dapat di-void" },
          { status: 400 }
        );
      }
      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status: INVOICE_STATUS.VOID,
          voidReason:
            body.voidReason === undefined
              ? existing.voidReason
              : String(body.voidReason || "") || null,
        },
        include: fullInclude,
      });
      return NextResponse.json(updated);
    }

    if (existing.status !== INVOICE_STATUS.DRAFT) {
      return NextResponse.json(
        { error: "Hanya draft yang dapat diedit" },
        { status: 400 }
      );
    }

    const data: {
      tanggal?: Date;
      dueDate?: Date | null;
      notes?: string | null;
      discountPct?: number;
      discountAmt?: number;
      subtotal?: number;
      dpp?: number;
      ppn?: number;
      pph?: number;
      grandTotal?: number;
    } = {};

    if (body.tanggal !== undefined) {
      data.tanggal = new Date(String(body.tanggal));
    }
    if (body.dueDate !== undefined) {
      data.dueDate =
        body.dueDate === null || body.dueDate === ""
          ? null
          : new Date(String(body.dueDate));
    }
    if (body.notes !== undefined) {
      data.notes =
        body.notes === null || body.notes === "" ? null : String(body.notes);
    }

    let items = existing.items;
    if (Array.isArray(body.items)) {
      await prisma.invoiceItem.deleteMany({ where: { invId: id } });
      items = await Promise.all(
        (body.items as Array<Record<string, unknown>>).map(async (it, idx) => {
          const qty = Number(it.qty) || 0;
          const unitPrice = Number(it.unitPrice) || 0;
          return prisma.invoiceItem.create({
            data: {
              invId: id,
              description: String(it.description || "Item"),
              qty,
              uom: String(it.uom || "Unit"),
              unitPrice,
              totalPrice: qty * unitPrice,
              sortOrder: idx,
            },
          });
        })
      );
    }

    const discountPct =
      body.discountPct !== undefined
        ? Number(body.discountPct)
        : existing.discountPct;
    const discountAmt =
      body.discountAmt !== undefined
        ? Number(body.discountAmt)
        : existing.discountAmt;
    const ppnPct =
      body.ppnPct !== undefined
        ? Number(body.ppnPct)
        : existing.dpp > 0
          ? (existing.ppn / existing.dpp) * 100
          : 11;
    const pphPct =
      body.pphPct !== undefined
        ? Number(body.pphPct)
        : existing.dpp > 0
          ? (existing.pph / existing.dpp) * 100
          : 0;

    const totals = computeInvoiceTotals({
      lineTotals: items.map((i) => i.totalPrice),
      discountPct,
      discountAmt,
      ppnPct,
      pphPct,
    });

    Object.assign(data, {
      discountPct: totals.discountPct,
      discountAmt: totals.discountAmt,
      subtotal: totals.subtotal,
      dpp: totals.dpp,
      ppn: totals.ppn,
      pph: totals.pph,
      grandTotal: totals.grandTotal,
    });

    const updated = await prisma.invoice.update({
      where: { id },
      data,
      include: fullInclude,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal memperbarui invoice" },
      { status: 500 }
    );
  }
}
