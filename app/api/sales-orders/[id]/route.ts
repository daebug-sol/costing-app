import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { SO_STATUS } from "@/lib/o2c/status";
import { requireSalesOrderInOrg } from "@/lib/tenant-context";
import { tenantWhere } from "@/lib/tenant-queries";

type Ctx = { params: Promise<{ id: string }> };

const fullInclude = {
  customer: true,
  items: { orderBy: { sortOrder: "asc" as const } },
  deliveries: {
    orderBy: { tanggal: "desc" as const },
    include: { items: true },
  },
  invoices: {
    orderBy: { tanggal: "desc" as const },
    include: { items: { orderBy: { sortOrder: "asc" as const } } },
  },
  quotation: { select: { id: true, noSurat: true, status: true } },
} as const;

export async function GET(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requireSalesOrderInOrg(id, orgId);
    if (!check.ok) return check.response;

    const row = await prisma.salesOrder.findFirst({
      where: tenantWhere.salesOrder(orgId, id),
      include: fullInclude,
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal memuat sales order" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requireSalesOrderInOrg(id, orgId);
    if (!check.ok) return check.response;

    const body = (await request.json()) as Record<string, unknown>;
    const data: {
      status?: string;
      poNumber?: string | null;
      notes?: string | null;
      paymentTerms?: string | null;
      deliveryTerms?: string | null;
    } = {};

    if (body.status !== undefined) {
      const s = String(body.status).trim().toLowerCase();
      const allowed = new Set(Object.values(SO_STATUS));
      if (!allowed.has(s as (typeof SO_STATUS)[keyof typeof SO_STATUS])) {
        return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
      }
      data.status = s;
    }
    if (body.poNumber !== undefined) {
      data.poNumber =
        body.poNumber === null || body.poNumber === ""
          ? null
          : String(body.poNumber);
    }
    if (body.notes !== undefined) {
      data.notes =
        body.notes === null || body.notes === "" ? null : String(body.notes);
    }
    if (body.paymentTerms !== undefined) {
      data.paymentTerms =
        body.paymentTerms === null || body.paymentTerms === ""
          ? null
          : String(body.paymentTerms);
    }
    if (body.deliveryTerms !== undefined) {
      data.deliveryTerms =
        body.deliveryTerms === null || body.deliveryTerms === ""
          ? null
          : String(body.deliveryTerms);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada field untuk diubah" },
        { status: 400 }
      );
    }

    await prisma.salesOrder.update({ where: { id }, data });
    const refreshed = await prisma.salesOrder.findFirst({
      where: tenantWhere.salesOrder(orgId, id),
      include: fullInclude,
    });
    return NextResponse.json(refreshed);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal memperbarui sales order" },
      { status: 500 }
    );
  }
}
