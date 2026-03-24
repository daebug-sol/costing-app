import { NextResponse } from "next/server";
import { costingProjectDetailInclude } from "@/lib/costing-project-include";
import { ensureDefaultUmumGroup, rollupManualSegmentFinancials } from "@/lib/manual-costing-rollup";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const { id: projectId } = await context.params;
    const project = await prisma.costingProject.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      type?: string;
      title?: string;
    };
    const type = body.type === "manual" ? "manual" : "ahu";

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

    const fullProject = await prisma.costingProject.findUnique({
      where: { id: projectId },
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
