import { NextResponse } from "next/server";
import { buildColumnId, sanitizeColumnId } from "@/lib/custom-db";
import { guardApiRoute } from "@/lib/api-guard";
import {
  ensureDefaultFolders,
  fileListOrder,
  isAhuDatasetKind,
  isDatabaseScope,
  type AhuFileSummary,
  type AhuDatasetKind,
  type CustomFileSummary,
} from "@/lib/database-folders";
import { prisma } from "@/lib/prisma";

const DEFAULT_COLUMNS = [
  { key: "col_code", header: "Code", locked: true, kind: "code", sortOrder: 0 },
  { key: "col_name", header: "Name", locked: true, kind: "name", sortOrder: 1 },
  { key: "col_uom", header: "UOM", locked: true, kind: "uom", sortOrder: 2 },
  { key: "col_price", header: "Price", locked: true, kind: "price", sortOrder: 3 },
];

export async function GET(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const url = new URL(request.url);
    const scopeParam = url.searchParams.get("scope");
    const folderId = url.searchParams.get("folderId");
    const kindParam = url.searchParams.get("kind");

    if (!scopeParam || !isDatabaseScope(scopeParam)) {
      return NextResponse.json(
        { error: "Parameter scope wajib: custom atau ahu" },
        { status: 400 }
      );
    }
    if (!folderId) {
      return NextResponse.json({ error: "Parameter folderId wajib" }, { status: 400 });
    }

    await ensureDefaultFolders(orgId);

    if (scopeParam === "custom") {
      const tables = await prisma.customDbTable.findMany({
        where: { folderId },
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { rows: true, columns: true } },
        },
      });
      const payload: CustomFileSummary[] = tables.map((t) => ({
        id: t.id,
        folderId: t.folderId,
        name: t.name,
        rowsCount: t._count.rows,
        columnsCount: t._count.columns,
        updatedAt: t.updatedAt.toISOString(),
      }));
      return NextResponse.json(payload);
    }

    if (!kindParam || !isAhuDatasetKind(kindParam)) {
      return NextResponse.json(
        { error: "Parameter kind wajib untuk AHU: materials, profiles, atau components" },
        { status: 400 }
      );
    }

    const files = await prisma.ahuDatasetFile.findMany({
      where: { folderId, kind: kindParam },
      orderBy: fileListOrder(),
      include: {
        _count: {
          select: { materials: true, profiles: true, components: true },
        },
      },
    });

    const payload: AhuFileSummary[] = files.map((f) => ({
      id: f.id,
      folderId: f.folderId,
      kind: f.kind as AhuDatasetKind,
      name: f.name,
      sortOrder: f.sortOrder,
      rowsCount:
        kindParam === "materials"
          ? f._count.materials
          : kindParam === "profiles"
            ? f._count.profiles
            : f._count.components,
      updatedAt: f.updatedAt.toISOString(),
    }));
    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal memuat daftar file" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const body = (await request.json()) as {
      scope?: string;
      folderId?: string;
      name?: string;
      kind?: string;
      columns?: Array<{ header?: string; kind?: string }>;
    };
    const scope = String(body.scope ?? "");
    const folderId = String(body.folderId ?? "");
    const name = String(body.name ?? "").trim();

    if (!isDatabaseScope(scope)) {
      return NextResponse.json({ error: "Scope tidak valid" }, { status: 400 });
    }
    if (!folderId) {
      return NextResponse.json({ error: "folderId wajib" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Nama file wajib diisi" }, { status: 400 });
    }

    const folder = await prisma.databaseFolder.findFirst({
      where: { id: folderId, organizationId: orgId },
    });
    if (!folder || folder.scope !== scope) {
      return NextResponse.json({ error: "Folder tidak ditemukan" }, { status: 404 });
    }

    if (scope === "ahu") {
      const kind = String(body.kind ?? "");
      if (!isAhuDatasetKind(kind)) {
        return NextResponse.json({ error: "Jenis dataset AHU tidak valid" }, { status: 400 });
      }
      const maxOrder = await prisma.ahuDatasetFile.aggregate({
        where: { folderId, kind },
        _max: { sortOrder: true },
      });
      const file = await prisma.ahuDatasetFile.create({
        data: {
          folderId,
          kind,
          name,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        },
      });
      return NextResponse.json(
        {
          id: file.id,
          folderId: file.folderId,
          kind: file.kind as AhuDatasetKind,
          name: file.name,
          sortOrder: file.sortOrder,
          rowsCount: 0,
          updatedAt: file.updatedAt.toISOString(),
        } satisfies AhuFileSummary,
        { status: 201 }
      );
    }

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

    const table = await prisma.customDbTable.create({
      data: { name, folderId, organizationId: orgId },
    });
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
    return NextResponse.json({ error: "Gagal membuat file" }, { status: 500 });
  }
}
