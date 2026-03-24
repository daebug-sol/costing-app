import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const materials = await prisma.materialPrice.findMany({
      orderBy: { code: "asc" },
    });
    return NextResponse.json(materials);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load materials" },
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
      density,
      pricePerKg,
      currency = "IDR",
      unit = "kg",
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

    const d = Number(density);
    const p = Number(pricePerKg);
    if (!Number.isFinite(d) || !Number.isFinite(p)) {
      return NextResponse.json(
        { error: "density and pricePerKg must be numbers" },
        { status: 400 }
      );
    }

    const material = await prisma.materialPrice.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        category: category.trim(),
        density: d,
        pricePerKg: p,
        currency: String(currency || "IDR"),
        unit: String(unit || "kg"),
        notes:
          notes === undefined || notes === null
            ? null
            : String(notes).trim() || null,
      },
    });
    return NextResponse.json(material, { status: 201 });
  } catch (e: unknown) {
    console.error(e);
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Material code already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create material" },
      { status: 500 }
    );
  }
}
