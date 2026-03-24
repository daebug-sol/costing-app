import { NextResponse } from "next/server";
import { finite } from "@/lib/calculations";
import { rollupManualSegmentFinancials } from "@/lib/manual-costing-rollup";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; segmentId: string; itemId: string }> };

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id: projectId, segmentId, itemId } = await context.params;

    const item = await prisma.manualCostingItem.findFirst({
      where: {
        id: itemId,
        group: { segmentId, segment: { projectId } },
      },
      include: {
        group: {
          include: { segment: { select: { type: true, projectId: true } } },
        },
      },
    });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (item.group.segment.type !== "manual") {
      return NextResponse.json(
        { error: "Segmen ini bukan manual costing" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      qty?: number;
      overridePrice?: number | null;
      wasteFactor?: number;
      sortOrder?: number;
    };

    const data: {
      qty?: number;
      overridePrice?: number | null;
      wasteFactor?: number;
      sortOrder?: number;
      effectivePrice?: number;
      subtotal?: number;
    } = {};

    if (body.qty !== undefined) {
      const q = finite(Number(body.qty), 0);
      if (q <= 0) {
        return NextResponse.json({ error: "qty must be > 0" }, { status: 400 });
      }
      data.qty = q;
    }
    if (body.overridePrice !== undefined) {
      if (body.overridePrice === null) {
        data.overridePrice = null;
      } else {
        const o = Number(body.overridePrice);
        if (!Number.isFinite(o) || o < 0) {
          return NextResponse.json(
            { error: "overridePrice must be a non-negative number or null" },
            { status: 400 }
          );
        }
        data.overridePrice = o;
      }
    }
    if (body.wasteFactor !== undefined) {
      const w = finite(Number(body.wasteFactor), 1);
      if (w <= 0) {
        return NextResponse.json(
          { error: "wasteFactor must be > 0" },
          { status: 400 }
        );
      }
      data.wasteFactor = w;
    }
    if (body.sortOrder !== undefined && Number.isFinite(body.sortOrder)) {
      data.sortOrder = Math.floor(Number(body.sortOrder));
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const merged = {
      qty: data.qty ?? item.qty,
      overridePrice:
        data.overridePrice !== undefined ? data.overridePrice : item.overridePrice,
      wasteFactor: data.wasteFactor ?? item.wasteFactor,
      basePrice: item.basePrice,
    };
    const eff = finite(merged.overridePrice ?? merged.basePrice, 0);
    data.effectivePrice = eff;
    data.subtotal = finite(merged.qty, 0) * eff * finite(merged.wasteFactor, 1);

    const updated = await prisma.manualCostingItem.update({
      where: { id: itemId },
      data,
    });

    await rollupManualSegmentFinancials(segmentId);

    const fresh = await prisma.manualCostingItem.findUnique({
      where: { id: itemId },
    });
    return NextResponse.json(fresh ?? updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id: projectId, segmentId, itemId } = await context.params;

    const item = await prisma.manualCostingItem.findFirst({
      where: {
        id: itemId,
        group: { segmentId, segment: { projectId } },
      },
      include: {
        group: {
          include: { segment: { select: { type: true } } },
        },
      },
    });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (item.group.segment.type !== "manual") {
      return NextResponse.json(
        { error: "Segmen ini bukan manual costing" },
        { status: 400 }
      );
    }

    await prisma.manualCostingItem.delete({ where: { id: itemId } });
    await rollupManualSegmentFinancials(segmentId);

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
