import { NextResponse } from "next/server";
import { hasColumnKey, isLockedColumnId, normalizeHeader, sanitizeColumnId } from "@/lib/custom-db";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tableId?: string; header?: string; kind?: string };
    const tableId = String(body.tableId ?? "").trim();
    const header = normalizeHeader(String(body.header ?? ""));
    const kind = normalizeHeader(String(body.kind ?? "text")).toLowerCase() || "text";
    if (!tableId || !header) {
      return NextResponse.json({ error: "tableId and header are required" }, { status: 400 });
    }
    const table = await prisma.customDbTable.findUnique({
      where: { id: tableId },
      include: { columns: { orderBy: { sortOrder: "asc" } } },
    });
    if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

    const price = table.columns.find((c) => hasColumnKey(c.id, "col_uom"));
    const insertOrder = price ? price.sortOrder : table.columns.length;
    const toShift = table.columns
      .filter((c) => c.sortOrder >= insertOrder)
      .sort((a, b) => b.sortOrder - a.sortOrder);
    await prisma.$transaction(
      toShift.map((c) =>
        prisma.customDbColumn.update({
          where: { id: c.id },
          data: { sortOrder: c.sortOrder + 1 },
        })
      )
    );

    const baseId = `${tableId}::col_${sanitizeColumnId(header)}`;
    let candidate = baseId;
    let seq = 1;
    const existingIds = new Set(table.columns.map((c) => c.id));
    while (existingIds.has(candidate)) {
      candidate = `${baseId}_${seq++}`;
    }

    const column = await prisma.customDbColumn.create({
      data: {
        id: candidate,
        tableId,
        header,
        sortOrder: insertOrder,
        locked: false,
        kind,
      },
    });
    return NextResponse.json(column, { status: 201 });
  } catch (e: unknown) {
    console.error(e);
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Nama kolom sudah ada di file ini" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create column" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { tableId?: string; order?: string[] };
    const tableId = String(body.tableId ?? "").trim();
    const order = Array.isArray(body.order) ? body.order : [];
    if (!tableId || order.length === 0) {
      return NextResponse.json({ error: "tableId and order are required" }, { status: 400 });
    }
    if (!hasColumnKey(order[0]!, "col_code") || !hasColumnKey(order[1]!, "col_name")) {
      return NextResponse.json({ error: "Locked columns order is invalid" }, { status: 400 });
    }
    const uomIdx = order.findIndex((id) => hasColumnKey(id, "col_uom"));
    const priceIdx = order.findIndex((id) => hasColumnKey(id, "col_price"));
    if (
      uomIdx < 0 ||
      priceIdx < 0 ||
      priceIdx !== order.length - 1 ||
      uomIdx !== order.length - 2
    ) {
      return NextResponse.json({ error: "UOM and Price must stay on the right edge" }, { status: 400 });
    }
    const cols = await prisma.customDbColumn.findMany({ where: { tableId } });
    const allIds = cols.map((c) => c.id);
    if (order.length !== allIds.length) {
      return NextResponse.json({ error: "Order length mismatch" }, { status: 400 });
    }
    for (const colId of order) {
      if (!allIds.includes(colId)) {
        return NextResponse.json({ error: `Unknown column: ${colId}` }, { status: 400 });
      }
    }
    for (const lockedId of ["col_code", "col_name", "col_uom", "col_price"]) {
      if (!order.some((id) => hasColumnKey(id, lockedId)) || !isLockedColumnId(lockedId)) {
        return NextResponse.json({ error: "Locked columns missing" }, { status: 400 });
      }
    }
    await prisma.$transaction(
      order.map((id, idx) =>
        prisma.customDbColumn.updateMany({
          where: { id, tableId },
          data: { sortOrder: idx },
        })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to reorder columns" }, { status: 500 });
  }
}
