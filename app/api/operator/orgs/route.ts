import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";

const orgSelect = {
  id: true,
  name: true,
  slug: true,
  plan: true,
  ahuModuleEnabled: true,
  createdAt: true,
} as const;

/** List all orgs for platform operators (cross-tenant by design). */
export async function GET(request: Request) {
  const auth = await requireOperator(request);
  if (!auth.ok) return auth.response;

  try {
    const orgs = await prisma.organization.findMany({
      select: orgSelect,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orgs });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to list organizations" },
      { status: 500 }
    );
  }
}
