import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finite } from "@/lib/calculations";
import { rollupSectionAndProject } from "@/lib/project-rollup";
import { guardApiRoute } from "@/lib/api-guard";
import { requirePermission } from "@/lib/permissions";
import { requireProjectInOrg, requireSectionInOrg } from "@/lib/tenant-context";

type Ctx = { params: Promise<{ id: string; sectionId: string }> };

export async function POST(request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const denied = requirePermission(guard.role, "costing:write");
  if (denied) return denied;
  const { orgId } = guard;

  try {
    const { id: projectId, sectionId } = await context.params;
    const projectCheck = await requireProjectInOrg(projectId, orgId);
    if (!projectCheck.ok) return projectCheck.response;
    const sectionCheck = await requireSectionInOrg(sectionId, projectId, orgId);
    if (!sectionCheck.ok) return sectionCheck.response;

    const body = (await request.json()) as Record<string, unknown>;

    const description = String(body.description ?? "").trim();
    const uom = String(body.uom ?? "pcs").trim() || "pcs";
    const qty = Number(body.qty);
    const unitPrice = Number(body.unitPrice);
    if (!description) {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) {
      return NextResponse.json(
        { error: "qty and unitPrice must be numbers" },
        { status: 400 }
      );
    }

    const waste = 1;
    const subtotal = finite(qty * unitPrice * waste, 0);

    const maxOrder = await prisma.costingLineItem.aggregate({
      where: { sectionId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const line = await prisma.costingLineItem.create({
      data: {
        sectionId,
        sortOrder,
        description,
        uom,
        qty,
        qtyFormula: String(qty),
        isOverride: false,
        unitPrice,
        currency: "IDR",
        wasteFactor: waste,
        subtotal,
        componentRef: null,
        notes: null,
      },
    });

    await rollupSectionAndProject(sectionId, projectId);

    return NextResponse.json(line, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create line item" },
      { status: 500 }
    );
  }
}
