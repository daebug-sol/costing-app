import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { costingProjectDetailInclude } from "@/lib/costing-project-include";
import { prisma } from "@/lib/prisma";
import { clearAhuSectionOverrides } from "@/lib/project-rollup";
import { requireProjectInOrg, requireSegmentInOrg } from "@/lib/tenant-context";

type Ctx = { params: Promise<{ id: string; segmentId: string }> };

/** Clear all category price overrides on an AHU segment ("Reset markup"). */
export async function POST(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "costing:write");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const { id: projectId, segmentId } = await context.params;
    const projectCheck = await requireProjectInOrg(projectId, orgId);
    if (!projectCheck.ok) return projectCheck.response;
    const segmentCheck = await requireSegmentInOrg(segmentId, projectId, orgId);
    if (!segmentCheck.ok) return segmentCheck.response;

    const segment = await prisma.costingSegment.findFirst({
      where: { id: segmentId, projectId },
    });
    if (!segment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (segment.type !== "ahu") {
      return NextResponse.json(
        { error: "Reset markup hanya untuk segmen AHU" },
        { status: 400 }
      );
    }

    await clearAhuSectionOverrides(segmentId, projectId);

    const refreshed = await prisma.costingProject.findUnique({
      where: { id: projectId },
      include: costingProjectDetailInclude,
    });
    return NextResponse.json(refreshed);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to reset markup" },
      { status: 500 }
    );
  }
}
