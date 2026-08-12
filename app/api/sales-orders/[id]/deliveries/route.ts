import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { nextDocumentNumber } from "@/lib/doc-numbering";
import { DOC_TYPES, DO_STATUS } from "@/lib/o2c/status";
import {
  deriveSoStatusFromDelivered,
  validateDeliveryQtys,
} from "@/lib/o2c/so-status";
import { prisma } from "@/lib/prisma";
import { requireSalesOrderInOrg } from "@/lib/tenant-context";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requireSalesOrderInOrg(id, orgId);
    if (!check.ok) return check.response;

    const rows = await prisma.deliveryOrder.findMany({
      where: { organizationId: orgId, salesOrderId: id },
      orderBy: { tanggal: "desc" },
      include: { items: true },
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal memuat surat jalan" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "o2c:delivery");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const { id: soId } = await context.params;
    const check = await requireSalesOrderInOrg(soId, orgId);
    if (!check.ok) return check.response;

    const body = (await request.json()) as {
      tanggal?: string;
      shippingAddress?: string;
      notes?: string;
      status?: string;
      items?: Array<{ soItemId: string; qtyDelivered: number }>;
    };

    const lines = (body.items ?? [])
      .map((it) => ({
        soItemId: String(it.soItemId),
        qtyDelivered: Number(it.qtyDelivered),
      }))
      .filter((it) => it.soItemId && Number.isFinite(it.qtyDelivered));

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal satu item untuk dikirim" },
        { status: 400 }
      );
    }

    const so = await prisma.salesOrder.findFirst({
      where: { id: soId, organizationId: orgId },
      include: { items: true },
    });
    if (!so) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const validation = validateDeliveryQtys(so.items, lines);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const doStatus =
      body.status === DO_STATUS.SENT || body.status === DO_STATUS.RECEIVED
        ? body.status
        : DO_STATUS.SENT;

    const created = await prisma.$transaction(async (tx) => {
      const doNumber = await nextDocumentNumber(DOC_TYPES.DO, orgId, tx);
      const doId = randomUUID();

      const delivery = await tx.deliveryOrder.create({
        data: {
          id: doId,
          organizationId: orgId,
          doNumber,
          salesOrderId: soId,
          tanggal: body.tanggal ? new Date(body.tanggal) : new Date(),
          status: doStatus,
          shippingAddress: body.shippingAddress?.trim() || so.clientAddress,
          notes: body.notes?.trim() || null,
          items: {
            create: lines.map((l) => ({
              id: randomUUID(),
              soItemId: l.soItemId,
              qtyDelivered: l.qtyDelivered,
            })),
          },
        },
        include: { items: true },
      });

      for (const line of lines) {
        await tx.salesOrderItem.update({
          where: { id: line.soItemId },
          data: { deliveredQty: { increment: line.qtyDelivered } },
        });
      }

      const refreshedItems = await tx.salesOrderItem.findMany({
        where: { soId },
      });
      const nextStatus = deriveSoStatusFromDelivered(refreshedItems, so.status);
      await tx.salesOrder.update({
        where: { id: soId },
        data: { status: nextStatus },
      });

      return delivery;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal membuat surat jalan" },
      { status: 500 }
    );
  }
}
