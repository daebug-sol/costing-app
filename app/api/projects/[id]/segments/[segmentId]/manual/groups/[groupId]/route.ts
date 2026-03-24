import { NextResponse } from "next/server";
import { rollupManualSegmentFinancials } from "@/lib/manual-costing-rollup";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; segmentId: string; groupId: string }> };

async function requireManualGroup(
  projectId: string,
  segmentId: string,
  groupId: string
) {
  const group = await prisma.manualCostingGroup.findFirst({
    where: { id: groupId, segmentId },
    include: {
      segment: { select: { projectId: true, type: true } },
    },
  });
  if (!group) return { error: "Not found" as const, status: 404 as const };
  if (group.segment.projectId !== projectId) {
    return { error: "Not found" as const, status: 404 as const };
  }
  if (group.segment.type !== "manual") {
    return {
      error: "Segmen ini bukan manual costing" as const,
      status: 400 as const,
    };
  }
  return { group };
}

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id: projectId, segmentId, groupId } = await context.params;
    const res = await requireManualGroup(projectId, segmentId, groupId);
    if ("error" in res) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }

    const body = (await request.json()) as {
      name?: string;
      sortOrder?: number;
    };
    const data: { name?: string; sortOrder?: number } = {};
    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      data.sortOrder = Math.floor(body.sortOrder);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await prisma.manualCostingGroup.update({
      where: { id: groupId },
      data,
    });

    const fresh = await prisma.manualCostingGroup.findUnique({
      where: { id: groupId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json(fresh);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update group" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id: projectId, segmentId, groupId } = await context.params;
    const res = await requireManualGroup(projectId, segmentId, groupId);
    if ("error" in res) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }

    await prisma.manualCostingGroup.delete({ where: { id: groupId } });
    await rollupManualSegmentFinancials(segmentId);

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 }
    );
  }
}
