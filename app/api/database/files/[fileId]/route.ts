import { NextResponse } from "next/server";
import { isDefaultAhuFileId } from "@/lib/database-folders";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ fileId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { fileId } = await params;
    const body = (await request.json()) as { name?: string; scope?: string };
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama file wajib diisi" }, { status: 400 });
    }

    const scope = String(body.scope ?? "");
    if (scope === "ahu" || (scope !== "custom" && !scope)) {
      const ahu = await prisma.ahuDatasetFile.findUnique({ where: { id: fileId } });
      if (ahu) {
        const updated = await prisma.ahuDatasetFile.update({
          where: { id: fileId },
          data: { name },
        });
        return NextResponse.json({
          id: updated.id,
          folderId: updated.folderId,
          kind: updated.kind,
          name: updated.name,
          sortOrder: updated.sortOrder,
          updatedAt: updated.updatedAt.toISOString(),
        });
      }
      if (scope === "ahu") {
        return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
      }
    }

    const table = await prisma.customDbTable.update({
      where: { id: fileId },
      data: { name },
    });
    return NextResponse.json({
      id: table.id,
      folderId: table.folderId,
      name: table.name,
      updatedAt: table.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal mengubah file" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { fileId } = await params;
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope");

    if (scope === "ahu" || !scope) {
      const ahu = await prisma.ahuDatasetFile.findUnique({ where: { id: fileId } });
      if (ahu) {
        if (isDefaultAhuFileId(fileId)) {
          return NextResponse.json(
            { error: "File default tidak dapat dihapus" },
            { status: 409 }
          );
        }
        await prisma.ahuDatasetFile.delete({ where: { id: fileId } });
        return new NextResponse(null, { status: 204 });
      }
      if (scope === "ahu") {
        return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
      }
    }

    await prisma.customDbTable.delete({ where: { id: fileId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal menghapus file" }, { status: 500 });
  }
}
