import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { finite } from "@/lib/calculations";
import { prisma } from "@/lib/prisma";
import { rollupAhuSegmentFinancials, rollupProjectFinancials } from "@/lib/project-rollup";
import { requireProjectInOrg } from "@/lib/tenant-context";

type Ctx = { params: Promise<{ id: string; sectionId: string }> };

/**
 * Set or clear a category price override on an AHU CostingSection.
 * Body: `{ overrideSubtotal: number | null }` — null/empty clears to calculated.
 */
export async function PUT(request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "costing:write");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const { id: projectId, sectionId } = await context.params;
    const projectCheck = await requireProjectInOrg(projectId, orgId);
    if (!projectCheck.ok) return projectCheck.response;

    const body = (await request.json().catch(() => ({}))) as {
      overrideSubtotal?: unknown;
    };

    const section = await prisma.costingSection.findFirst({
      where: {
        id: sectionId,
        segment: { projectId, project: { organizationId: orgId } },
      },
    });
    if (!section) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let overrideSubtotal: number | null;
    if (
      body.overrideSubtotal === null ||
      body.overrideSubtotal === undefined ||
      body.overrideSubtotal === ""
    ) {
      overrideSubtotal = null;
    } else {
      const n = Number(body.overrideSubtotal);
      if (!Number.isFinite(n)) {
        return NextResponse.json(
          { error: "overrideSubtotal must be a number or null" },
          { status: 400 }
        );
      }
      overrideSubtotal = finite(n, 0);
    }

    const updated = await prisma.costingSection.update({
      where: { id: sectionId },
      data: { overrideSubtotal },
    });

    await rollupAhuSegmentFinancials(section.segmentId);
    await rollupProjectFinancials(projectId);

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update section override" },
      { status: 500 }
    );
  }
}
