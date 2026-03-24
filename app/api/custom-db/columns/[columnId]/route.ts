import { NextResponse } from "next/server";
import { isLockedColumnId, normalizeHeader } from "@/lib/custom-db";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ columnId: string }> };

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { columnId } = await context.params;
    if (isLockedColumnId(columnId)) {
      return NextResponse.json({ error: "Locked columns cannot be renamed" }, { status: 400 });
    }
    const body = (await request.json()) as { header?: string };
    const header = normalizeHeader(String(body.header ?? ""));
    if (!header) return NextResponse.json({ error: "header is required" }, { status: 400 });
    const updated = await prisma.customDbColumn.update({
      where: { id: columnId },
      data: { header },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to rename column" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { columnId } = await context.params;
    if (isLockedColumnId(columnId)) {
      return NextResponse.json({ error: "Locked columns cannot be deleted" }, { status: 400 });
    }
    const col = await prisma.customDbColumn.findUnique({ where: { id: columnId } });
    if (!col) return NextResponse.json({ error: "Column not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.customDbCell.deleteMany({ where: { columnId } }),
      prisma.customDbColumn.delete({ where: { id: columnId } }),
      prisma.customDbColumn.updateMany({
        where: { tableId: col.tableId, sortOrder: { gt: col.sortOrder } },
        data: { sortOrder: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete column" }, { status: 500 });
  }
}
