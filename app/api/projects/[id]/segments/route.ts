import { NextResponse } from "next/server";
import { costingProjectDetailInclude } from "@/lib/costing-project-include";
import { ensureDefaultUmumGroup, rollupManualSegmentFinancials } from "@/lib/manual-costing-rollup";
import { getOrgModules, requireAhuModule } from "@/lib/org-modules";
import { prisma } from "@/lib/prisma";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { requireProjectInOrg } from "@/lib/tenant-context";
import { tenantWhere } from "@/lib/tenant-queries";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
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
      type?: string;
      title?: string;
    };

    const modules = await getOrgModules(orgId);
    let type: "ahu" | "manual";
    if (body.type === "manual") {
      type = "manual";
    } else if (body.type === "ahu") {
      const ahuGate = await requireAhuModule(orgId);
      if (!ahuGate.ok) return ahuGate.response;
      type = "ahu";
    } else {
      // Omitted type: AHU when enabled (backward compat), else manual.
      type = modules.ahu ? "ahu" : "manual";
    }

    const maxOrder = await prisma.costingSegment.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
    const n = sortOrder + 1;
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : type === "ahu"
          ? `AHU ${n}`
          : `Manual ${n}`;

    const seg = await prisma.costingSegment.create({
      data: {
        projectId,
        type,
        title,
        sortOrder,
      },
    });

    if (type === "manual") {
      await ensureDefaultUmumGroup(seg.id);
      await rollupManualSegmentFinancials(seg.id);
    }

    const fullProject = await prisma.costingProject.findFirst({
      where: tenantWhere.project(orgId, projectId),
      include: costingProjectDetailInclude,
    });
    return NextResponse.json(fullProject);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create segment" },
      { status: 500 }
    );
  }
}
