import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const {
      code,
      name,
      category,
      subcategory,
      brand,
      model,
      spec,
      unitPrice,
      currency,
      unit,
      moq,
      leadTimeDays,
      supplier,
      notes,
    } = body;

    const data: {
      code?: string;
      name?: string;
      category?: string;
      subcategory?: string | null;
      brand?: string | null;
      model?: string | null;
      spec?: string | null;
      unitPrice?: number;
      currency?: string;
      unit?: string;
      moq?: number | null;
      leadTimeDays?: number | null;
      supplier?: string | null;
      notes?: string | null;
    } = {};

    if (code !== undefined) data.code = String(code).trim();
    if (name !== undefined) data.name = String(name).trim();
    if (category !== undefined) data.category = String(category).trim();

    if (subcategory !== undefined)
      data.subcategory =
        subcategory === null || subcategory === ""
          ? null
          : String(subcategory).trim() || null;
    if (brand !== undefined)
      data.brand =
        brand === null || brand === ""
          ? null
          : String(brand).trim() || null;
    if (model !== undefined)
      data.model =
        model === null || model === ""
          ? null
          : String(model).trim() || null;
    if (spec !== undefined)
      data.spec =
        spec === null || spec === ""
          ? null
          : String(spec).trim() || null;
    if (supplier !== undefined)
      data.supplier =
        supplier === null || supplier === ""
          ? null
          : String(supplier).trim() || null;
    if (notes !== undefined)
      data.notes =
        notes === null || notes === ""
          ? null
          : String(notes).trim() || null;

    if (unitPrice !== undefined) {
      const up = Number(unitPrice);
      if (!Number.isFinite(up))
        return NextResponse.json(
          { error: "Invalid unitPrice" },
          { status: 400 }
        );
      data.unitPrice = up;
    }
    if (currency !== undefined) data.currency = String(currency);
    if (unit !== undefined) data.unit = String(unit);

    if (moq !== undefined) {
      if (moq === null || moq === "") data.moq = null;
      else {
        const m = Number(moq);
        if (!Number.isFinite(m) || !Number.isInteger(m))
          return NextResponse.json({ error: "Invalid moq" }, { status: 400 });
        data.moq = m;
      }
    }
    if (leadTimeDays !== undefined) {
      if (leadTimeDays === null || leadTimeDays === "")
        data.leadTimeDays = null;
      else {
        const l = Number(leadTimeDays);
        if (!Number.isFinite(l) || !Number.isInteger(l))
          return NextResponse.json(
            { error: "Invalid leadTimeDays" },
            { status: 400 }
          );
        data.leadTimeDays = l;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const component = await prisma.componentCatalog.update({
      where: { id },
      data,
    });
    return NextResponse.json(component);
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
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Component code already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update component" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    await prisma.componentCatalog.delete({ where: { id } });
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
      { error: "Failed to delete component" },
      { status: 500 }
    );
  }
}
