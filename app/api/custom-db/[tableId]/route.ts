import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { requireCustomTableInOrg } from "@/lib/tenant-context";
import { tenantWhere } from "@/lib/tenant-queries";

type Ctx = { params: Promise<{ tableId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { tableId } = await context.params;
    const tableCheck = await requireCustomTableInOrg(tableId, orgId);
    if (!tableCheck.ok) return tableCheck.response;

    const table = await prisma.customDbTable.findFirst({
      where: tenantWhere.customTable(orgId, tableId),
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
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "db:write");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const { tableId } = await context.params;
    const tableCheck = await requireCustomTableInOrg(tableId, orgId);
    if (!tableCheck.ok) return tableCheck.response;

    const body = (await request.json()) as { name?: string };
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const updated = await prisma.customDbTable.update({
      where: tenantWhere.customTable(orgId, tableId),
      data: { name },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to rename file" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "db:write");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const { tableId } = await context.params;
    const tableCheck = await requireCustomTableInOrg(tableId, orgId);
    if (!tableCheck.ok) return tableCheck.response;

    await prisma.customDbTable.delete({
      where: tenantWhere.customTable(orgId, tableId),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
