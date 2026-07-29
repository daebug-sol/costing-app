import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { requireAhuModule } from "@/lib/org-modules";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "@/lib/tenant-queries";

type Ctx = { params: Promise<{ id: string }> };

async function findMaterial(orgId: string, id: string) {
  return prisma.materialPrice.findFirst({
    where: tenantWhere.material(orgId, id),
  });
}

export async function PUT(request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  const ahuGate = await requireAhuModule(orgId);
  if (!ahuGate.ok) return ahuGate.response;

  try {
    const { id } = await context.params;
    const existing = await findMaterial(orgId, id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json();
    const {
      code,
      name,
      category,
      density,
      pricePerKg,
      currency,
      unit,
      notes,
    } = body;

    const data: {
      code?: string;
      name?: string;
      category?: string;
      density?: number;
      pricePerKg?: number;
      currency?: string;
      unit?: string;
      notes?: string | null;
    } = {};

    if (code !== undefined) data.code = String(code).trim();
    if (name !== undefined) data.name = String(name).trim();
    if (category !== undefined) data.category = String(category).trim();
    if (density !== undefined) {
      const d = Number(density);
      if (!Number.isFinite(d))
        return NextResponse.json({ error: "Invalid density" }, { status: 400 });
      data.density = d;
    }
    if (pricePerKg !== undefined) {
      const p = Number(pricePerKg);
      if (!Number.isFinite(p))
        return NextResponse.json(
          { error: "Invalid pricePerKg" },
          { status: 400 }
        );
      data.pricePerKg = p;
    }
    if (currency !== undefined) data.currency = String(currency);
    if (unit !== undefined) data.unit = String(unit);
    if (notes !== undefined)
      data.notes =
        notes === null || notes === ""
          ? null
          : String(notes).trim() || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const material = await prisma.materialPrice.update({
      where: { id },
      data,
    });
    return NextResponse.json(material);
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
        { error: "Material code already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update material" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId } = guard;

  const ahuGate = await requireAhuModule(orgId);
  if (!ahuGate.ok) return ahuGate.response;

  try {
    const { id } = await context.params;
    const existing = await findMaterial(orgId, id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.materialPrice.delete({ where: { id } });
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
      { error: "Failed to delete material" },
      { status: 500 }
    );
  }
}
