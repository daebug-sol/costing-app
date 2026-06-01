import { NextResponse } from "next/server";
import { isDefaultFolderId } from "@/lib/database-folders";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ folderId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { folderId } = await params;
    const body = (await request.json()) as { name?: string };
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama folder wajib diisi" }, { status: 400 });
    }
    const folder = await prisma.databaseFolder.update({
      where: { id: folderId },
      data: { name },
    });
    return NextResponse.json({
      id: folder.id,
      scope: folder.scope,
      name: folder.name,
      sortOrder: folder.sortOrder,
      updatedAt: folder.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal mengubah folder" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { folderId } = await params;
    const folder = await prisma.databaseFolder.findUnique({
      where: { id: folderId },
      include: {
        _count: { select: { customTables: true, ahuFiles: true } },
      },
    });
    if (!folder) {
      return NextResponse.json({ error: "Folder tidak ditemukan" }, { status: 404 });
    }
    if (isDefaultFolderId(folderId)) {
      return NextResponse.json(
        { error: "Folder default tidak dapat dihapus" },
        { status: 409 }
      );
    }
    const fileCount = folder._count.customTables + folder._count.ahuFiles;
    if (fileCount > 0) {
      return NextResponse.json(
        {
          error:
            "Folder masih berisi file. Pindahkan atau hapus file terlebih dahulu.",
        },
        { status: 409 }
      );
    }
    await prisma.databaseFolder.delete({ where: { id: folderId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal menghapus folder" }, { status: 500 });
  }
}
