import { NextResponse } from "next/server";
import { applyCustomDbCellValue } from "@/lib/custom-db-cell-update";
import { prisma } from "@/lib/prisma";
import { guardApiRoute } from "@/lib/api-guard";
import { requireCustomRowInOrg } from "@/lib/tenant-context";

export async function PATCH(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const body = (await request.json()) as {
      rowId?: string;
      columnId?: string;
      rawValue?: string;
    };
    const rowId = String(body.rowId ?? "").trim();
    const columnId = String(body.columnId ?? "").trim();
    const rawValue = String(body.rawValue ?? "");
    if (!rowId || !columnId) {
      return NextResponse.json({ error: "rowId and columnId are required" }, { status: 400 });
    }

    const rowCheck = await requireCustomRowInOrg(rowId, orgId);
    if (!rowCheck.ok) return rowCheck.response;

    try {
      const saved = await applyCustomDbCellValue(rowId, columnId, rawValue, orgId);
      const cells = await prisma.customDbCell.findMany({
        where: { rowId },
        select: {
          rowId: true,
          columnId: true,
          rawValue: true,
          computedValue: true,
        },
      });
      return NextResponse.json({
        rowId,
        updatedCell: saved,
        cells,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "Row not found") {
        return NextResponse.json({ error: "Row not found" }, { status: 404 });
      }
      throw err;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update cell" }, { status: 500 });
  }
}
