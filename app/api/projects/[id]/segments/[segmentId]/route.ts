import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { costingProjectDetailInclude } from "@/lib/costing-project-include";
import { prisma } from "@/lib/prisma";
import { syncQuotationItemsFromProject } from "@/lib/sync-quotation-items-from-project";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { requireProjectInOrg, requireSegmentInOrg } from "@/lib/tenant-context";
import { tenantWhere } from "@/lib/tenant-queries";

type Ctx = { params: Promise<{ id: string; segmentId: string }> };

export async function PUT(request: Request, context: Ctx) {
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

    const body = (await request.json()) as Record<string, unknown>;
    const num = (v: unknown) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const data: Prisma.CostingSegmentUpdateInput = {};

    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.sortOrder !== undefined) {
      const so = num(body.sortOrder);
      if (so !== undefined && so !== null)
        data.sortOrder = Math.floor(so);
    }
    if (body.ahuModel !== undefined) {
      data.ahuModel =
        body.ahuModel === null || body.ahuModel === ""
          ? null
          : String(body.ahuModel);
    }
    if (body.ahuRef !== undefined) {
      data.ahuRef =
        body.ahuRef === null || body.ahuRef === ""
          ? null
          : String(body.ahuRef);
    }
    if (body.flowCMH !== undefined) {
      const f = num(body.flowCMH);
      data.flowCMH = f === undefined ? undefined : f;
    }
    if (body.qty !== undefined) {
      const q = num(body.qty);
      if (q !== undefined && q !== null)
        data.qty = Math.max(1, Math.floor(q));
    }
    if (body.dimH !== undefined) {
      const d = num(body.dimH);
      data.dimH = d === undefined ? undefined : d;
    }
    if (body.dimW !== undefined) {
      const d = num(body.dimW);
      data.dimW = d === undefined ? undefined : d;
    }
    if (body.dimD !== undefined) {
      const d = num(body.dimD);
      data.dimD = d === undefined ? undefined : d;
    }
    if (body.profileType !== undefined) {
      data.profileType =
        body.profileType === null || body.profileType === ""
          ? null
          : String(body.profileType);
    }

    const hasAhuRecalcJson = body.ahuRecalcParams !== undefined;
    const prismaFieldCount = Object.keys(data).length;

    if (prismaFieldCount === 0 && !hasAhuRecalcJson) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    /**
     * `ahuRecalcParams` disimpan lewat SQL mentah agar tetap jalan bila klien Prisma
     * di dev (Turbopack cache) belum ter-generate ulang — hindari Unknown argument `ahuRecalcParams`.
     */
    await prisma.$transaction(async (tx) => {
      if (prismaFieldCount > 0) {
        await tx.costingSegment.update({
          where: { id: segmentId },
          data,
        });
      }
      if (hasAhuRecalcJson) {
        const now = new Date();
        if (body.ahuRecalcParams === null) {
          await tx.$executeRaw`
            UPDATE "CostingSegment"
            SET "ahuRecalcParams" = NULL, "updatedAt" = ${now}
            WHERE "id" = ${segmentId}
          `;
        } else if (
          typeof body.ahuRecalcParams === "object" &&
          !Array.isArray(body.ahuRecalcParams)
        ) {
          const jsonText = JSON.stringify(body.ahuRecalcParams);
          await tx.$executeRaw`
            UPDATE "CostingSegment"
            SET "ahuRecalcParams" = ${jsonText}, "updatedAt" = ${now}
            WHERE "id" = ${segmentId}
          `;
        } else {
          throw new Error(
            "ahuRecalcParams must be null or a plain object (JSON)"
          );
        }
      }
    });

    const fullProject = await prisma.costingProject.findFirst({
      where: tenantWhere.project(orgId, projectId),
      include: costingProjectDetailInclude,
    });
    try {
      await syncQuotationItemsFromProject(projectId);
    } catch (e) {
      console.error("syncQuotationItemsFromProject", e);
    }
    return NextResponse.json(fullProject);
  } catch (e) {
    console.error(e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to update segment", detail },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
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

    await prisma.costingSegment.delete({ where: { id: segmentId } });

    const { rollupProjectFinancials } = await import("@/lib/project-rollup");
    await rollupProjectFinancials(projectId);

    const fullProject = await prisma.costingProject.findFirst({
      where: tenantWhere.project(orgId, projectId),
      include: costingProjectDetailInclude,
    });
    return NextResponse.json(fullProject);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete segment" },
      { status: 500 }
    );
  }
}
