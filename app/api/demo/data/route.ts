import { NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/api-guard";
import { getDisplayName } from "@/lib/auth";
import { clearDemoData, seedDemoData } from "@/lib/demo-seed";
import { logger } from "@/lib/logger";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

// Writing a year of sample data takes a few seconds.
export const maxDuration = 60;

/**
 * Trial organizations only: replace ALL business data with generated sample
 * data (`sample`) or remove it for a clean start (`empty`).
 */
export async function POST(request: Request) {
  const guard = await guardApiRoute();
  if ("response" in guard) return guard.response;
  const { orgId, userId, role } = guard;

  const denied = requirePermission(role, "members:manage");
  if (denied) return denied;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { trialEndsAt: true },
  });
  if (!org?.trialEndsAt) {
    return NextResponse.json(
      { error: "Hanya tersedia untuk organisasi demo.", code: "NOT_TRIAL" },
      { status: 403 }
    );
  }

  const limited = await enforceRateLimit({
    orgId,
    bucket: "demo-data",
    limit: 3,
    windowMs: 10 * 60_000,
    message: "Terlalu sering. Coba lagi beberapa menit lagi.",
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const mode = (body as { mode?: unknown } | null)?.mode;
  if (mode !== "sample" && mode !== "empty") {
    return NextResponse.json({ error: "mode must be sample or empty" }, { status: 400 });
  }

  try {
    if (mode === "empty") {
      await clearDemoData(orgId);
    } else {
      await seedDemoData(orgId, {
        ownerUserId: userId,
        ownerRole: role,
        ownerName: (await getDisplayName()) ?? undefined,
      });
    }
    logger.info("demo.data.reset", { route: "/api/demo/data", orgId, userId, mode });
    return NextResponse.json({ ok: true, mode });
  } catch (e) {
    logger.error("demo data reset failed", { orgId, error: String(e) });
    return NextResponse.json(
      { error: "Gagal mengubah data demo. Coba lagi." },
      { status: 500 }
    );
  }
}
