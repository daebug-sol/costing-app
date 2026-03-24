import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ids?: unknown };
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: "ids array required" },
        { status: 400 }
      );
    }
    const ids = body.ids.filter((id): id is string => typeof id === "string" && id.length > 0);
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No valid ids" },
        { status: 400 }
      );
    }
    const result = await prisma.quotation.deleteMany({
      where: { id: { in: ids } },
    });
    return NextResponse.json({ deleted: result.count });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete quotations" },
      { status: 500 }
    );
  }
}
