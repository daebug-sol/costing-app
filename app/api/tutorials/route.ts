import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { getDisplayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTourKey, type TourProgress, type TourStatus } from "@/lib/tour/types";

function isStatus(value: unknown): value is TourStatus {
  return value === "done" || value === "skipped";
}

/** The caller's own tutorial progress in the active org. */
export async function GET() {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId, userId } = guard;

  const rows = await prisma.tutorialProgress.findMany({
    where: { organizationId: orgId, userId },
    select: { tutorialKey: true, status: true },
  });
  const progress: TourProgress = {};
  for (const row of rows) {
    if (isTourKey(row.tutorialKey) && isStatus(row.status)) {
      progress[row.tutorialKey] = row.status;
    }
  }
  return NextResponse.json({ progress, displayName: await getDisplayName() });
}

/** Save one tutorial's status; `status: null` clears it (replay). */
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
  const { key, status } = (body ?? {}) as { key?: unknown; status?: unknown };
  if (!isTourKey(key) || !(status === null || isStatus(status))) {
    return NextResponse.json({ error: "Invalid key or status" }, { status: 400 });
  }

  if (status === null) {
    await prisma.tutorialProgress.deleteMany({
      where: { organizationId: orgId, userId, tutorialKey: key },
    });
  } else {
    await prisma.tutorialProgress.upsert({
      where: {
        organizationId_userId_tutorialKey: {
          organizationId: orgId,
          userId,
          tutorialKey: key,
        },
      },
      create: { organizationId: orgId, userId, tutorialKey: key, status },
      update: { status },
    });
  }
  return NextResponse.json({ ok: true });
}
