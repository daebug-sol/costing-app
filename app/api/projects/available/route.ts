import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Costing projects that can be added as quotation lines (final / approved, selling > 0). */
export async function GET() {
  try {
    const rows = await prisma.costingProject.findMany({
      where: {
        status: { in: ["final", "approved", "finalized"] },
        totalSelling: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        totalSelling: true,
        qty: true,
        segments: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: {
            ahuModel: true,
            ahuRef: true,
            flowCMH: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    const mapped = rows.map((r) => {
      const s0 = r.segments[0];
      return {
        id: r.id,
        name: r.name,
        totalSelling: r.totalSelling,
        qty: r.qty,
        ahuModel: s0?.ahuModel ?? null,
        ahuRef: s0?.ahuRef ?? null,
        flowCMH: s0?.flowCMH ?? null,
      };
    });
    return NextResponse.json(mapped);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 }
    );
  }
}
