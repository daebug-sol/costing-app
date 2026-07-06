import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApiRoute } from "@/lib/api-guard";
import { requireProjectInOrg, requireSegmentInOrg } from "@/lib/tenant-context";

type Ctx = { params: Promise<{ id: string; segmentId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  try {
    const { id: projectId, segmentId } = await context.params;
    const projectCheck = await requireProjectInOrg(projectId, orgId);
    if (!projectCheck.ok) return projectCheck.response;
    const segmentCheck = await requireSegmentInOrg(segmentId, projectId, orgId);
    if (!segmentCheck.ok) return segmentCheck.response;

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

    const groups = await prisma.manualCostingGroup.findMany({
      where: { segmentId },
      orderBy: { sortOrder: "asc" },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ groups });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load manual costing" },
      { status: 500 }
    );
  }
}
