import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; segmentId: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const { id: projectId, segmentId } = await context.params;
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

    const body = (await request.json()) as { name?: string; sortOrder?: number };
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    let sortOrder = body.sortOrder;
    if (typeof sortOrder !== "number" || !Number.isFinite(sortOrder)) {
      const maxOrder = await prisma.manualCostingGroup.aggregate({
        where: { segmentId },
        _max: { sortOrder: true },
      });
      sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
    }

    const group = await prisma.manualCostingGroup.create({
      data: {
        segmentId,
        name,
        sortOrder,
      },
      include: { items: true },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
