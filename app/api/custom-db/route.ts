import { NextResponse } from "next/server";
import { buildColumnId, sanitizeColumnId } from "@/lib/custom-db";
import { prisma } from "@/lib/prisma";

const DEFAULT_COLUMNS = [
  { key: "col_code", header: "Code", locked: true, kind: "code", sortOrder: 0 },
  { key: "col_name", header: "Name", locked: true, kind: "name", sortOrder: 1 },
  { key: "col_uom", header: "UOM", locked: true, kind: "uom", sortOrder: 2 },
  { key: "col_price", header: "Price", locked: true, kind: "price", sortOrder: 3 },
];

export async function GET() {
  try {
    const tables = await prisma.customDbTable.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { rows: true, columns: true },
        },
      },
    });
    return NextResponse.json(
      tables.map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        rowsCount: t._count.rows,
        columnsCount: t._count.columns,
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load custom database" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; columns?: Array<{ header?: string; kind?: string }> };
    const name = String(body.name ?? "").trim() || "Custom Database";
    const dynamicColumns = (Array.isArray(body.columns) ? body.columns : [])
      .map((c, idx) => {
        const base = sanitizeColumnId(String(c.header ?? ""));
        return {
        id: `col_${base}_${idx + 1}_${Math.random().toString(36).slice(2, 6)}`,
        header: String(c.header ?? "").trim(),
        locked: false,
        kind: String(c.kind ?? "text").trim() || "text",
      };
      })
      .filter((c) => c.header.length > 0);
    const table = await prisma.customDbTable.create({ data: { name } });
    const columns = [
      {
        id: buildColumnId(table.id, DEFAULT_COLUMNS[0].key),
        header: DEFAULT_COLUMNS[0].header,
        locked: true,
        kind: DEFAULT_COLUMNS[0].kind,
        sortOrder: 0,
      },
      {
        id: buildColumnId(table.id, DEFAULT_COLUMNS[1].key),
        header: DEFAULT_COLUMNS[1].header,
        locked: true,
        kind: DEFAULT_COLUMNS[1].kind,
        sortOrder: 1,
      },
      ...dynamicColumns.map((c, idx) => ({
        ...c,
        sortOrder: idx + 2,
      })),
      {
        id: buildColumnId(table.id, DEFAULT_COLUMNS[2].key),
        header: DEFAULT_COLUMNS[2].header,
        locked: true,
        kind: DEFAULT_COLUMNS[2].kind,
        sortOrder: dynamicColumns.length + 2,
      },
      {
        id: buildColumnId(table.id, DEFAULT_COLUMNS[3].key),
        header: DEFAULT_COLUMNS[3].header,
        locked: true,
        kind: DEFAULT_COLUMNS[3].kind,
        sortOrder: dynamicColumns.length + 3,
      },
    ];
    await prisma.customDbColumn.createMany({
      data: columns.map((c) => ({ ...c, tableId: table.id })),
    });
    const full = await prisma.customDbTable.findUnique({
      where: { id: table.id },
      include: { columns: { orderBy: { sortOrder: "asc" } }, rows: true },
    });
    return NextResponse.json(full, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create custom table" }, { status: 500 });
  }
}
