import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const profiles = await prisma.profileData.findMany({
      orderBy: { code: "asc" },
    });
    return NextResponse.json(profiles);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load profiles" },
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
      type,
      weightPerM,
      pricePerM,
      panelThick,
      notes,
    } = body;

    if (
      typeof code !== "string" ||
      !code.trim() ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof type !== "string" ||
      !type.trim()
    ) {
      return NextResponse.json(
        { error: "code, name, and type are required" },
        { status: 400 }
      );
    }

    const w = Number(weightPerM);
    const p = Number(pricePerM);
    if (!Number.isFinite(w) || !Number.isFinite(p)) {
      return NextResponse.json(
        { error: "weightPerM and pricePerM must be numbers" },
        { status: 400 }
      );
    }

    let panel: number | null = null;
    if (panelThick !== undefined && panelThick !== null && panelThick !== "") {
      const pt = Number(panelThick);
      if (!Number.isFinite(pt) || !Number.isInteger(pt)) {
        return NextResponse.json(
          { error: "panelThick must be an integer" },
          { status: 400 }
        );
      }
      panel = pt;
    }

    const profile = await prisma.profileData.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        type: type.trim(),
        weightPerM: w,
        pricePerM: p,
        panelThick: panel,
        notes:
          notes === undefined || notes === null
            ? null
            : String(notes).trim() || null,
      },
    });
    return NextResponse.json(profile, { status: 201 });
  } catch (e: unknown) {
    console.error(e);
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
      { error: "Failed to create profile" },
      { status: 500 }
    );
  }
}
