import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { customerToSnapshot } from "@/lib/customer-snapshot";
import { computeInvoiceTotals } from "@/lib/o2c/invoice-totals";
import { INVOICE_KIND, INVOICE_STATUS } from "@/lib/o2c/status";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings, tenantWhere } from "@/lib/tenant-queries";

export async function GET(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") ?? "").trim().toLowerCase();

    const rows = await prisma.invoice.findMany({
      where: {
        ...tenantWhere.invoices(orgId),
        ...(status && status !== "all" ? { status } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, company: true } },
        salesOrder: { select: { id: true, soNumber: true } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal memuat invoice" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const body = (await request.json()) as {
      salesOrderId?: string;
      deliveryOrderId?: string;
      customerId?: string;
      kind?: string;
      dpPercent?: number;
      discountPct?: number;
      discountAmt?: number;
      ppnPct?: number;
      pphPct?: number;
      dueDate?: string;
      tanggal?: string;
      notes?: string;
      items?: Array<{
        description: string;
        qty: number;
        uom?: string;
        unitPrice: number;
      }>;
    };

    const settings = await getOrCreateSettings(orgId);
    const kind = (body.kind ?? INVOICE_KIND.FINAL).toLowerCase();
    if (!Object.values(INVOICE_KIND).includes(kind as "dp" | "progress" | "final")) {
      return NextResponse.json({ error: "Jenis invoice tidak valid" }, { status: 400 });
    }

    let customerId = body.customerId ?? null;
    let salesOrderId = body.salesOrderId ?? null;
    let snapshot = {
      clientName: null as string | null,
      clientCompany: null as string | null,
      clientAddress: null as string | null,
      clientAttn: null as string | null,
      clientPhone: null as string | null,
    };
    let lineItems = body.items ?? [];

    if (body.deliveryOrderId) {
      const dorder = await prisma.deliveryOrder.findFirst({
        where: { id: body.deliveryOrderId, organizationId: orgId },
        include: {
          items: { include: { soItem: true } },
          salesOrder: { include: { customer: true } },
        },
      });
      if (!dorder) {
        return NextResponse.json(
          { error: "Surat jalan tidak ditemukan" },
          { status: 404 }
        );
      }
      salesOrderId = dorder.salesOrderId;
      customerId = dorder.salesOrder.customerId;
      snapshot = customerToSnapshot(dorder.salesOrder.customer);
      if (lineItems.length === 0) {
        lineItems = dorder.items.map((di) => ({
          description: di.soItem.description,
          qty: di.qtyDelivered,
          uom: di.soItem.uom,
          unitPrice: di.soItem.unitPrice,
        }));
      }
    } else if (salesOrderId) {
      const so = await prisma.salesOrder.findFirst({
        where: { id: salesOrderId, organizationId: orgId },
        include: { items: { orderBy: { sortOrder: "asc" } }, customer: true },
      });
      if (!so) {
        return NextResponse.json(
          { error: "Sales order tidak ditemukan" },
          { status: 404 }
        );
      }
      customerId = so.customerId;
      snapshot = customerToSnapshot(so.customer);
      if (lineItems.length === 0) {
        const dpPct = Number(body.dpPercent);
        if (kind === INVOICE_KIND.DP && Number.isFinite(dpPct) && dpPct > 0) {
          const amount = (so.grandTotal * dpPct) / 100;
          lineItems = [
            {
              description: `Down payment ${dpPct}% — SO ${so.soNumber}`,
              qty: 1,
              uom: "Lot",
              unitPrice: amount,
            },
          ];
        } else {
          lineItems = so.items.map((it) => ({
            description: it.description,
            qty: it.qty,
            uom: it.uom,
            unitPrice: it.unitPrice,
          }));
        }
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId atau salesOrderId wajib" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: orgId },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "Pelanggan tidak ditemukan" },
        { status: 404 }
      );
    }
    if (!snapshot.clientName) snapshot = customerToSnapshot(customer);

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: "Invoice harus punya item" },
        { status: 400 }
      );
    }

    const normalized = lineItems.map((it, idx) => {
      const qty = Number(it.qty) || 0;
      const unitPrice = Number(it.unitPrice) || 0;
      return {
        id: randomUUID(),
        description: String(it.description || "Item").trim(),
        qty,
        uom: it.uom?.trim() || "Unit",
        unitPrice,
        totalPrice: qty * unitPrice,
        sortOrder: idx,
      };
    });

    const ppnPct =
      body.ppnPct !== undefined ? Number(body.ppnPct) : settings.ppnRate;
    const totals = computeInvoiceTotals({
      lineTotals: normalized.map((i) => i.totalPrice),
      discountPct: Number(body.discountPct) || 0,
      discountAmt: Number(body.discountAmt) || 0,
      ppnPct: Number.isFinite(ppnPct) ? ppnPct : 11,
      pphPct: Number(body.pphPct) || 0,
    });

    const inv = await prisma.invoice.create({
      data: {
        id: randomUUID(),
        organizationId: orgId,
        salesOrderId,
        customerId,
        tanggal: body.tanggal ? new Date(body.tanggal) : new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        kind,
        subtotal: totals.subtotal,
        discountPct: totals.discountPct,
        discountAmt: totals.discountAmt,
        dpp: totals.dpp,
        ppn: totals.ppn,
        pph: totals.pph,
        grandTotal: totals.grandTotal,
        paidTotal: 0,
        status: INVOICE_STATUS.DRAFT,
        notes: body.notes?.trim() || null,
        clientName: snapshot.clientName,
        clientCompany: snapshot.clientCompany,
        clientAddress: snapshot.clientAddress,
        clientAttn: snapshot.clientAttn,
        clientPhone: snapshot.clientPhone,
        items: { create: normalized },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        customer: true,
        salesOrder: { select: { id: true, soNumber: true } },
      },
    });

    return NextResponse.json(inv, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal membuat invoice" },
      { status: 500 }
    );
  }
}
