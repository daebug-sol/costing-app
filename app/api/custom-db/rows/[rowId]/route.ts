import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ rowId: string }> };

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { rowId } = await context.params;
    const row = await prisma.customDbRow.findUnique({ where: { id: rowId } });
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
