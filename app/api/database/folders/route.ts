import { NextResponse } from "next/server";
import {
  ensureDefaultFolders,
  folderListOrder,
  isDatabaseScope,
  type DatabaseScope,
  type FolderSummary,
} from "@/lib/database-folders";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const scopeParam = new URL(request.url).searchParams.get("scope");
    if (!scopeParam || !isDatabaseScope(scopeParam)) {
      return NextResponse.json(
        { error: "Parameter scope wajib: custom atau ahu" },
        { status: 400 }
      );
    }
    await ensureDefaultFolders();
    const folders = await prisma.databaseFolder.findMany({
      where: { scope: scopeParam },
      orderBy: folderListOrder(),
      include: {
        _count: {
          select: { customTables: true, ahuFiles: true },
        },
      },
    });
    const payload: FolderSummary[] = folders.map((f) => ({
      id: f.id,
      scope: f.scope as DatabaseScope,
      name: f.name,
      sortOrder: f.sortOrder,
      filesCount:
        scopeParam === "custom" ? f._count.customTables : f._count.ahuFiles,
      updatedAt: f.updatedAt.toISOString(),
    }));
    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal memuat folder" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { scope?: string; name?: string };
    const scope = String(body.scope ?? "");
    const name = String(body.name ?? "").trim();
    if (!isDatabaseScope(scope)) {
      return NextResponse.json({ error: "Scope tidak valid" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Nama folder wajib diisi" }, { status: 400 });
    }
    const maxOrder = await prisma.databaseFolder.aggregate({
      where: { scope },
      _max: { sortOrder: true },
    });
    const folder = await prisma.databaseFolder.create({
      data: {
        scope,
        name,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    return NextResponse.json(
      {
        id: folder.id,
        scope: folder.scope as DatabaseScope,
        name: folder.name,
        sortOrder: folder.sortOrder,
        filesCount: 0,
        updatedAt: folder.updatedAt.toISOString(),
      } satisfies FolderSummary,
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal membuat folder" }, { status: 500 });
  }
}
