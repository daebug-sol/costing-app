import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { code, name, type, weightPerM, pricePerM, panelThick, notes } =
      body;

    const data: {
      code?: string;
      name?: string;
      type?: string;
      weightPerM?: number;
      pricePerM?: number;
      panelThick?: number | null;
      notes?: string | null;
    } = {};

    if (code !== undefined) data.code = String(code).trim();
    if (name !== undefined) data.name = String(name).trim();
    if (type !== undefined) data.type = String(type).trim();
    if (weightPerM !== undefined) {
      const w = Number(weightPerM);
      if (!Number.isFinite(w))
        return NextResponse.json(
          { error: "Invalid weightPerM" },
          { status: 400 }
        );
      data.weightPerM = w;
    }
    if (pricePerM !== undefined) {
      const p = Number(pricePerM);
      if (!Number.isFinite(p))
        return NextResponse.json(
          { error: "Invalid pricePerM" },
          { status: 400 }
        );
      data.pricePerM = p;
    }
    if (panelThick !== undefined) {
      if (panelThick === null || panelThick === "") data.panelThick = null;
      else {
        const pt = Number(panelThick);
        if (!Number.isFinite(pt) || !Number.isInteger(pt))
          return NextResponse.json(
            { error: "panelThick must be an integer or empty" },
            { status: 400 }
          );
        data.panelThick = pt;
      }
    }
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

    const profile = await prisma.profileData.update({
      where: { id },
      data,
    });
    return NextResponse.json(profile);
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
        { error: "Profile code already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    await prisma.profileData.delete({ where: { id } });
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
      { error: "Failed to delete profile" },
      { status: 500 }
    );
  }
}
