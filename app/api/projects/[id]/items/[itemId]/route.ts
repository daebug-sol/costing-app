import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finite } from "@/lib/calculations";
import { rollupSectionAndProject } from "@/lib/project-rollup";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id: projectId, itemId } = await context.params;
    const body = await request.json();
    const qtyRaw = body.qty;
    const qty = Number(qtyRaw);
    if (!Number.isFinite(qty)) {
      return NextResponse.json({ error: "qty must be a number" }, { status: 400 });
    }

    const item = await prisma.costingLineItem.findFirst({
      where: {
        id: itemId,
        section: { segment: { projectId } },
      },
    });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const waste = finite(item.wasteFactor, 1);
    const unitPrice = finite(item.unitPrice, 0);
    const subtotal = finite(qty * unitPrice * waste, 0);

    await prisma.costingLineItem.update({
      where: { id: itemId },
      data: {
        qty,
        isOverride: true,
        subtotal,
      },
    });

    await rollupSectionAndProject(item.sectionId, projectId);

    const updated = await prisma.costingLineItem.findUnique({
      where: { id: itemId },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update line item" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id: projectId, itemId } = await context.params;

    const item = await prisma.costingLineItem.findFirst({
      where: {
        id: itemId,
        section: { segment: { projectId } },
      },
    });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let newQty = finite(item.qty, 0);
    const formula = item.qtyFormula?.trim() ?? "";
    if (/^-?\d+(\.\d+)?$/.test(formula)) {
      const parsed = Number(formula);
      if (Number.isFinite(parsed)) newQty = parsed;
    }

    const waste = finite(item.wasteFactor, 1);
    const unitPrice = finite(item.unitPrice, 0);
    const subtotal = finite(newQty * unitPrice * waste, 0);

    await prisma.costingLineItem.update({
      where: { id: itemId },
      data: {
        qty: newQty,
        isOverride: false,
        subtotal,
      },
    });

    await rollupSectionAndProject(item.sectionId, projectId);

    const updated = await prisma.costingLineItem.findUnique({
      where: { id: itemId },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to reset line item" },
      { status: 500 }
    );
  }
}
