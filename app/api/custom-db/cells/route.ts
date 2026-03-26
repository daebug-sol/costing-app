import { NextResponse } from "next/server";
import { applyCustomDbCellValue } from "@/lib/custom-db-cell-update";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
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

    try {
      const saved = await applyCustomDbCellValue(rowId, columnId, rawValue);
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
