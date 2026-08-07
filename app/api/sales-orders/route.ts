import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "@/lib/tenant-queries";

const listInclude = {
  customer: { select: { id: true, name: true, company: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
  quotation: { select: { id: true, noSurat: true } },
} as const;

export async function GET(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") ?? "").trim().toLowerCase();
    const month = (searchParams.get("month") ?? "").trim(); // YYYY-MM

    const rows = await prisma.salesOrder.findMany({
      where: {
        ...tenantWhere.salesOrders(orgId),
        ...(status && status !== "all" ? { status } : {}),
        ...(month
          ? {
              tanggal: {
                gte: new Date(`${month}-01T00:00:00.000Z`),
                lt: new Date(
                  new Date(`${month}-01T00:00:00.000Z`).getFullYear(),
                  new Date(`${month}-01T00:00:00.000Z`).getMonth() + 1,
                  1
                ),
              },
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: listInclude,
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal memuat sales order" },
      { status: 500 }
    );
  }
}
