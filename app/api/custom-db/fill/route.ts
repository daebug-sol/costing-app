import { NextResponse } from "next/server";
import { applyCustomDbCellValue } from "@/lib/custom-db-cell-update";
import { prisma } from "@/lib/prisma";

type TargetCell = { rowId: string; columnId: string };

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceRowId?: string;
      sourceColumnId?: string;
      columnId?: string;
      targetRowIds?: string[];
      targets?: TargetCell[];
    };
    const sourceRowId = String(body.sourceRowId ?? "").trim();
    const sourceColumnId = String(body.sourceColumnId ?? body.columnId ?? "").trim();
    const legacyColumnId = String(body.columnId ?? "").trim();

    if (!sourceRowId || !sourceColumnId) {
      return NextResponse.json(
        { error: "sourceRowId and sourceColumnId are required" },
        { status: 400 }
      );
    }

    const src = await prisma.customDbCell.findUnique({
      where: { rowId_columnId: { rowId: sourceRowId, columnId: sourceColumnId } },
    });
    const rawValue = src?.rawValue ?? "";

    const targets: TargetCell[] = Array.isArray(body.targets)
      ? body.targets
          .map((t) => ({
            rowId: String(t?.rowId ?? "").trim(),
            columnId: String(t?.columnId ?? "").trim(),
          }))
          .filter((t) => t.rowId && t.columnId)
      : [];

    if (targets.length > 0) {
      for (const t of targets) {
        if (t.rowId === sourceRowId && t.columnId === sourceColumnId) continue;
        await applyCustomDbCellValue(t.rowId, t.columnId, rawValue);
      }
      return NextResponse.json({ ok: true });
    }

    const targetRowIds = Array.isArray(body.targetRowIds) ? body.targetRowIds : [];
    const columnId = legacyColumnId || sourceColumnId;
    if (targetRowIds.length === 0 || !columnId) {
      return NextResponse.json(
        { error: "Provide targets[] or legacy columnId + targetRowIds" },
        { status: 400 }
      );
    }
    for (const rowId of targetRowIds) {
      if (rowId === sourceRowId) continue;
      await applyCustomDbCellValue(rowId, columnId, rawValue);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fill values" }, { status: 500 });
  }
}
