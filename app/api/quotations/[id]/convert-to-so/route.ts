import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { convertQuotationToSo } from "@/lib/o2c/convert-quotation-to-so";
import { prisma } from "@/lib/prisma";
import { requireQuotationInOrg } from "@/lib/tenant-context";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { id } = await context.params;
    const check = await requireQuotationInOrg(id, orgId);
    if (!check.ok) return check.response;

    let poNumber: string | null = null;
    let forceWon = false;
    try {
      const body = (await request.json()) as {
        poNumber?: string;
        forceWon?: boolean;
      };
      poNumber = body.poNumber?.trim() || null;
      forceWon = Boolean(body.forceWon);
    } catch {
      /* empty body ok */
    }

    const result = await prisma.$transaction((tx) =>
      convertQuotationToSo(tx, orgId, id, { poNumber, forceWon })
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 }
      );
    }

    const so = await prisma.salesOrder.findFirst({
      where: { id: result.salesOrderId, organizationId: orgId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        customer: true,
      },
    });

    return NextResponse.json(so, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Gagal mengonversi ke Sales Order" },
      { status: 500 }
    );
  }
}
