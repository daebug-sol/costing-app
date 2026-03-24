import { NextResponse } from "next/server";
import { finite } from "@/lib/calculations";
import { rollupManualSegmentFinancials } from "@/lib/manual-costing-rollup";
import { resolveManualSource } from "@/lib/manual-source-resolve";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; segmentId: string; groupId: string }> };

type BulkInput = {
  sourceType?: string;
  sourceId?: string;
  qty?: number;
  code?: string;
  name?: string;
  category?: string;
  uom?: string;
  basePrice?: number;
};

export async function POST(request: Request, context: Ctx) {
  try {
    const { id: projectId, segmentId, groupId } = await context.params;

    const segment = await prisma.costingSegment.findFirst({
      where: { id: segmentId, projectId },
      select: { id: true, type: true },
    });
    if (!segment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (segment.type !== "manual") {
      return NextResponse.json(
        { error: "Segmen ini bukan manual costing" },
        { status: 400 }
      );
    }

    const group = await prisma.manualCostingGroup.findFirst({
      where: { id: groupId, segmentId },
    });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const body = (await request.json()) as { items?: BulkInput[] };
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.manualCostingItem.aggregate({
      where: { groupId },
      _max: { sortOrder: true },
    });
    let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const created: string[] = [];

    for (const inp of rawItems) {
      const sourceType = String(inp.sourceType ?? "").toLowerCase();
      const sourceId = String(inp.sourceId ?? "").trim();
      if (!sourceId || (sourceType !== "material" && sourceType !== "profile" && sourceType !== "component")) {
        return NextResponse.json(
          { error: "Each item needs valid sourceType and sourceId" },
          { status: 400 }
        );
      }

      const resolved = await resolveManualSource(sourceType, sourceId);
      if (!resolved) {
        return NextResponse.json(
          { error: `Unknown source: ${sourceType} ${sourceId}` },
          { status: 400 }
        );
      }

      const qty = finite(Number(inp.qty), 0);
      if (qty <= 0) {
        return NextResponse.json(
          { error: "Each item needs qty > 0" },
          { status: 400 }
        );
      }

      const basePrice = resolved.basePrice;
      const eff = basePrice;
      const wasteFactor = 1;
      const subtotal = qty * eff * wasteFactor;

      const row = await prisma.manualCostingItem.create({
        data: {
          groupId,
          sortOrder: nextOrder++,
          sourceType,
          sourceId,
          code: resolved.code,
          name: resolved.name,
          category: resolved.category,
          uom: resolved.uom,
          qty,
          basePrice,
          overridePrice: null,
          effectivePrice: eff,
          wasteFactor,
          subtotal,
        },
      });
      created.push(row.id);
    }

    await rollupManualSegmentFinancials(segmentId);

    const items = await prisma.manualCostingItem.findMany({
      where: { id: { in: created } },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ items }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to add items" },
      { status: 500 }
    );
  }
}
