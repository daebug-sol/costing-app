import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApiRoute } from "@/lib/api-guard";
import { requireCustomRowInOrg } from "@/lib/tenant-context";

type Ctx = { params: Promise<{ rowId: string }> };

export async function DELETE(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { rowId } = await context.params;
    const rowCheck = await requireCustomRowInOrg(rowId, orgId);
    if (!rowCheck.ok) return rowCheck.response;

    const row = await prisma.customDbRow.findFirst({
      where: { id: rowId, table: { organizationId: orgId } },
    });
    if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });
    await prisma.$transaction([
      prisma.customDbCell.deleteMany({ where: { rowId } }),
      prisma.customDbRow.delete({ where: { id: rowId } }),
      prisma.customDbRow.updateMany({
        where: { tableId: row.tableId, sortOrder: { gt: row.sortOrder } },
        data: { sortOrder: { decrement: 1 } },
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to remove row" }, { status: 500 });
  }
}
