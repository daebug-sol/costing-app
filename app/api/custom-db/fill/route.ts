import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceRowId?: string;
      columnId?: string;
      targetRowIds?: string[];
    };
    const sourceRowId = String(body.sourceRowId ?? "").trim();
    const columnId = String(body.columnId ?? "").trim();
    const targetRowIds = Array.isArray(body.targetRowIds) ? body.targetRowIds : [];
    if (!sourceRowId || !columnId || targetRowIds.length === 0) {
      return NextResponse.json(
        { error: "sourceRowId, columnId, targetRowIds are required" },
        { status: 400 }
      );
    }
    const src = await prisma.customDbCell.findUnique({
      where: { rowId_columnId: { rowId: sourceRowId, columnId } },
    });
    const rawValue = src?.rawValue ?? "";
    await prisma.$transaction(
      targetRowIds.map((rowId) =>
        prisma.customDbCell.upsert({
          where: { rowId_columnId: { rowId, columnId } },
          create: { rowId, columnId, rawValue, computedValue: null },
          update: { rawValue, computedValue: null },
        })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fill values" }, { status: 500 });
  }
}
