import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.costingProject.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        qty: true,
        totalHPP: true,
        totalSelling: true,
        updatedAt: true,
        createdAt: true,
        _count: { select: { segments: true } },
        segments: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: {
            type: true,
            ahuModel: true,
            flowCMH: true,
          },
        },
      },
    });
    const rows = projects.map((p) => {
      const s0 = p.segments[0];
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        qty: p.qty,
        totalHPP: p.totalHPP,
        totalSelling: p.totalSelling,
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
        segmentCount: p._count.segments,
        previewAhuModel: s0?.ahuModel ?? null,
        previewFlowCMH: s0?.flowCMH ?? null,
      };
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to list projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const num = (v: unknown) => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const project = await prisma.costingProject.create({
      data: {
        name,
        status:
          typeof body.status === "string" ? body.status : "draft",
        qty: Number.isFinite(Number(body.qty))
          ? Math.max(1, Math.floor(Number(body.qty)))
          : 1,
        overhead: num(body.overhead) ?? undefined,
        contingency: num(body.contingency) ?? undefined,
        eskalasi: num(body.eskalasi) ?? undefined,
        asuransi: num(body.asuransi) ?? undefined,
        mobilisasi: num(body.mobilisasi) ?? undefined,
        margin: num(body.margin) ?? undefined,
        notes:
          body.notes === undefined || body.notes === null
            ? null
            : String(body.notes),
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
