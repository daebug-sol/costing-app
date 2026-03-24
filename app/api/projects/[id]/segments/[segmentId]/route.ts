import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { costingProjectDetailInclude } from "@/lib/costing-project-include";
import { prisma } from "@/lib/prisma";
import { syncQuotationItemsFromProject } from "@/lib/sync-quotation-items-from-project";

type Ctx = { params: Promise<{ id: string; segmentId: string }> };

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id: projectId, segmentId } = await context.params;
    const existing = await prisma.costingSegment.findFirst({
      where: { id: segmentId, projectId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

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

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    await prisma.costingSegment.update({
      where: { id: segmentId },
      data,
    });

    const fullProject = await prisma.costingProject.findUnique({
      where: { id: projectId },
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
    return NextResponse.json(
      { error: "Failed to update segment" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id: projectId, segmentId } = await context.params;
    const existing = await prisma.costingSegment.findFirst({
      where: { id: segmentId, projectId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.costingSegment.delete({ where: { id: segmentId } });

    const { rollupProjectFinancials } = await import("@/lib/project-rollup");
    await rollupProjectFinancials(projectId);

    const fullProject = await prisma.costingProject.findUnique({
      where: { id: projectId },
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
