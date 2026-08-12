import { NextResponse } from "next/server";
import { isLockedColumnId, normalizeHeader } from "@/lib/custom-db";
import { prisma } from "@/lib/prisma";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { requireCustomTableInOrg } from "@/lib/tenant-context";

type Ctx = { params: Promise<{ columnId: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "db:write");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const { columnId } = await context.params;
    if (isLockedColumnId(columnId)) {
      return NextResponse.json({ error: "Locked columns cannot be renamed" }, { status: 400 });
    }

    const col = await prisma.customDbColumn.findFirst({
      where: { id: columnId, table: { organizationId: orgId } },
      select: { tableId: true },
    });
    if (!col) return NextResponse.json({ error: "Column not found" }, { status: 404 });
    const tableCheck = await requireCustomTableInOrg(col.tableId, orgId);
    if (!tableCheck.ok) return tableCheck.response;

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
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "db:write");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const { columnId } = await context.params;
    if (isLockedColumnId(columnId)) {
      return NextResponse.json({ error: "Locked columns cannot be deleted" }, { status: 400 });
    }
    const col = await prisma.customDbColumn.findFirst({
      where: { id: columnId, table: { organizationId: orgId } },
    });
    if (!col) return NextResponse.json({ error: "Column not found" }, { status: 404 });
    const tableCheck = await requireCustomTableInOrg(col.tableId, orgId);
    if (!tableCheck.ok) return tableCheck.response;

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
