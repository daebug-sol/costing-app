import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { trialStateOf } from "@/lib/trial";

/** Demo status of the caller's org. Stays reachable after the demo has ended. */
export async function GET() {
  const guard = await guardApiRoute({ allowExpired: true });
  if ("response" in guard) return guard.response;

  const org = await prisma.organization.findUnique({
    where: { id: guard.orgId },
    select: { trialEndsAt: true },
  });
  return NextResponse.json(trialStateOf(org?.trialEndsAt));
}
