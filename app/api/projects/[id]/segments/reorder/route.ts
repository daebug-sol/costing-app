import { NextResponse } from "next/server";
import { costingProjectDetailInclude } from "@/lib/costing-project-include";
import { prisma } from "@/lib/prisma";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { requireProjectInOrg } from "@/lib/tenant-context";
import { tenantWhere } from "@/lib/tenant-queries";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "costing:write");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const { id: projectId } = await context.params;
    const projectCheck = await requireProjectInOrg(projectId, orgId);
    if (!projectCheck.ok) return projectCheck.response;

    const body = (await request.json().catch(() => ({}))) as {
      segmentIds?: unknown;
    };
    const segmentIds = Array.isArray(body.segmentIds)
      ? body.segmentIds.map((x) => String(x))
      : [];

    if (segmentIds.length === 0) {
      return NextResponse.json(
        { error: "segmentIds array required" },
        { status: 400 }
      );
    }

    const existing = await prisma.costingSegment.findMany({
      where: { projectId },
      select: { id: true },
    });
    const setE = new Set(existing.map((e) => e.id));
    if (segmentIds.length !== setE.size) {
      return NextResponse.json(
        { error: "segmentIds must list every segment exactly once" },
        { status: 400 }
      );
    }
    for (const id of segmentIds) {
      if (!setE.has(id)) {
        return NextResponse.json(
          { error: "Invalid segment id in list" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(
      segmentIds.map((segmentId, sortOrder) =>
        prisma.costingSegment.update({
          where: { id: segmentId, projectId },
          data: { sortOrder },
        })
      )
    );

    const fullProject = await prisma.costingProject.findFirst({
      where: tenantWhere.project(orgId, projectId),
      include: costingProjectDetailInclude,
    });
    return NextResponse.json(fullProject);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to reorder segments" },
      { status: 500 }
    );
  }
}
