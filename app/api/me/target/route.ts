import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { parseMonthlyTarget } from "@/lib/dashboard-personal";
import { prisma } from "@/lib/prisma";

const where = (orgId: string, userId: string) => ({
  organizationId_userId: { organizationId: orgId, userId },
});

/** The caller's own monthly sales target (per member, never another user's). */
export async function GET() {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId, userId } = guard;
  const row = await prisma.organizationMember.findUnique({
    where: where(orgId, userId),
    select: { monthlyTarget: true },
  });
  return NextResponse.json({ monthlyTarget: row?.monthlyTarget ?? null });
}

export async function PUT(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId, userId } = guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseMonthlyTarget((body as { monthlyTarget?: unknown } | null)?.monthlyTarget);
  if (parsed === "invalid") {
    return NextResponse.json({ error: "Invalid monthlyTarget" }, { status: 400 });
  }

  const row = await prisma.organizationMember.upsert({
    where: where(orgId, userId),
    update: { monthlyTarget: parsed },
    create: { organizationId: orgId, userId, monthlyTarget: parsed },
    select: { monthlyTarget: true },
  });
  return NextResponse.json({ monthlyTarget: row.monthlyTarget });
}
