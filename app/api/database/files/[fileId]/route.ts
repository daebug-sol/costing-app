import { NextResponse } from "next/server";
import { isDefaultAhuFileId } from "@/lib/database-folders";
import { prisma } from "@/lib/prisma";
import { guardApiRoute } from "@/lib/api-guard";
import {
  requireAhuFileInOrg,
  requireCustomTableInOrg,
} from "@/lib/tenant-context";

type Params = { params: Promise<{ fileId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

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
        const check = await requireAhuFileInOrg(fileId, orgId);
        if (!check.ok) return check.response;
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

    const tableCheck = await requireCustomTableInOrg(fileId, orgId);
    if (!tableCheck.ok) return tableCheck.response;

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
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { fileId } = await params;
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope");

    if (scope === "ahu" || !scope) {
      const ahu = await prisma.ahuDatasetFile.findUnique({ where: { id: fileId } });
      if (ahu) {
        const check = await requireAhuFileInOrg(fileId, orgId);
        if (!check.ok) return check.response;
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

    const tableCheck = await requireCustomTableInOrg(fileId, orgId);
    if (!tableCheck.ok) return tableCheck.response;

    await prisma.customDbTable.delete({ where: { id: fileId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Gagal menghapus file" }, { status: 500 });
  }
}
