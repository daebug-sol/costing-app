import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const components = await prisma.componentCatalog.findMany({
      orderBy: { code: "asc" },
    });
    return NextResponse.json(components);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load components" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
      currency = "IDR",
      unit = "pcs",
      moq,
      leadTimeDays,
      supplier,
      notes,
    } = body;

    if (
      typeof code !== "string" ||
      !code.trim() ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof category !== "string" ||
      !category.trim()
    ) {
      return NextResponse.json(
        { error: "code, name, and category are required" },
        { status: 400 }
      );
    }

    const up = Number(unitPrice);
    if (!Number.isFinite(up)) {
      return NextResponse.json(
        { error: "unitPrice must be a number" },
        { status: 400 }
      );
    }

    const parseOptInt = (v: unknown): number | null => {
      if (v === undefined || v === null || v === "") return null;
      const n = Number(v);
      if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
      return n;
    };

    const component = await prisma.componentCatalog.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        category: category.trim(),
        subcategory:
          subcategory === undefined || subcategory === null || subcategory === ""
            ? null
            : String(subcategory).trim() || null,
        brand:
          brand === undefined || brand === null || brand === ""
            ? null
            : String(brand).trim() || null,
        model:
          model === undefined || model === null || model === ""
            ? null
            : String(model).trim() || null,
        spec:
          spec === undefined || spec === null || spec === ""
            ? null
            : String(spec).trim() || null,
        unitPrice: up,
        currency: String(currency || "IDR"),
        unit: String(unit || "pcs"),
        moq: parseOptInt(moq),
        leadTimeDays: parseOptInt(leadTimeDays),
        supplier:
          supplier === undefined || supplier === null || supplier === ""
            ? null
            : String(supplier).trim() || null,
        notes:
          notes === undefined || notes === null
            ? null
            : String(notes).trim() || null,
      },
    });
    return NextResponse.json(component, { status: 201 });
  } catch (e: unknown) {
    console.error(e);
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
      { error: "Failed to create component" },
      { status: 500 }
    );
  }
}
