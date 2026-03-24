import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { costingProjectDetailInclude } from "@/lib/costing-project-include";
import { prisma } from "@/lib/prisma";
import { syncQuotationItemsFromProject } from "@/lib/sync-quotation-items-from-project";

type Ctx = { params: Promise<{ id: string }> };

export const projectDetailInclude = costingProjectDetailInclude;

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const project = await prisma.costingProject.findUnique({
      where: { id },
      include: costingProjectDetailInclude,
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load project" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const num = (v: unknown) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.status !== undefined) data.status = String(body.status);
    if (body.qty !== undefined) {
      const q = num(body.qty);
      if (q !== undefined && q !== null)
        data.qty = Math.max(1, Math.floor(q));
    }
    if (body.overhead !== undefined) data.overhead = num(body.overhead);
    if (body.contingency !== undefined)
      data.contingency = num(body.contingency);
    if (body.eskalasi !== undefined) data.eskalasi = num(body.eskalasi);
    if (body.asuransi !== undefined) data.asuransi = num(body.asuransi);
    if (body.mobilisasi !== undefined) data.mobilisasi = num(body.mobilisasi);
    if (body.margin !== undefined) data.margin = num(body.margin);
    if (body.totalHPP !== undefined) data.totalHPP = num(body.totalHPP);
    if (body.totalSelling !== undefined)
      data.totalSelling = num(body.totalSelling);
    if (body.notes !== undefined)
      data.notes = body.notes === null ? null : String(body.notes);

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const project = await prisma.costingProject.update({
      where: { id },
      data: data as Prisma.CostingProjectUpdateInput,
      include: costingProjectDetailInclude,
    });

    try {
      await syncQuotationItemsFromProject(id);
    } catch (e) {
      console.error("syncQuotationItemsFromProject", e);
    }

    return NextResponse.json(project);
  } catch (e: unknown) {
    console.error(e);
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    await prisma.costingProject.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    console.error(e);
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
