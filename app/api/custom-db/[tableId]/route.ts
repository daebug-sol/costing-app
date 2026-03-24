import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ tableId: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const { tableId } = await context.params;
    const table = await prisma.customDbTable.findUnique({
      where: { id: tableId },
      include: {
        columns: { orderBy: { sortOrder: "asc" } },
        rows: { orderBy: { sortOrder: "asc" }, include: { cells: true } },
      },
    });
    if (!table) return NextResponse.json({ error: "File not found" }, { status: 404 });
    return NextResponse.json(table);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load file" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { tableId } = await context.params;
    const body = (await request.json()) as { name?: string };
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const updated = await prisma.customDbTable.update({ where: { id: tableId }, data: { name } });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to rename file" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { tableId } = await context.params;
    await prisma.customDbTable.delete({ where: { id: tableId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
