import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { requireCustomTableInOrg } from "@/lib/tenant-context";

export async function POST(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "db:write");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const body = (await request.json()) as { tableId?: string };
    const tableId = String(body.tableId ?? "").trim();
    if (!tableId) return NextResponse.json({ error: "tableId is required" }, { status: 400 });

    const tableCheck = await requireCustomTableInOrg(tableId, orgId);
    if (!tableCheck.ok) return tableCheck.response;

    const maxOrder = await prisma.customDbRow.aggregate({
      where: { tableId },
      _max: { sortOrder: true },
    });
    const row = await prisma.customDbRow.create({
      data: { tableId, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to add row" }, { status: 500 });
  }
}
