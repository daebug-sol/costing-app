import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [projects, quotations] = await Promise.all([
      prisma.costingProject.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          totalHPP: true,
          totalSelling: true,
          updatedAt: true,
          segments: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { ahuModel: true, flowCMH: true },
          },
        },
      }),
      prisma.quotation.findMany({
        select: { status: true },
      }),
    ]);

    const totalProjects = projects.length;
    const activeCosting = projects.filter(
      (p) => p.status.toLowerCase() === "draft"
    ).length;

    const pendingQuotation = quotations.filter(
      (q) => q.status.toLowerCase() === "draft"
    ).length;
    const approved = quotations.filter(
      (q) => q.status.toLowerCase() === "approved"
    ).length;

    const flatProject = (p: (typeof projects)[number]) => {
      const s0 = p.segments[0];
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        totalHPP: p.totalHPP,
        totalSelling: p.totalSelling,
        updatedAt: p.updatedAt,
        ahuModel: s0?.ahuModel ?? null,
        flowCMH: s0?.flowCMH ?? null,
      };
    };
    const recentProjects = projects.slice(0, 5).map(flatProject);
    const chartProjects = recentProjects;

    return NextResponse.json({
      kpis: {
        totalProjects,
        activeCosting,
        pendingQuotation,
        approved,
      },
      recentProjects,
      chartProjects,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
