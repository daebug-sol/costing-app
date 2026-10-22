import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  checkRedeemable,
  hashActivationCode,
  isWellFormedActivationCode,
  normalizeActivationCode,
} from "@/lib/activation-code";
import { getDisplayName, getUserEmail, isAuthBypassed, requireAuth } from "@/lib/auth";
import { seedDemoData } from "@/lib/demo-seed";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { addDays } from "@/lib/trial";

const INVALID = "Kode tidak valid atau sudah tidak berlaku.";

async function createClerkOrg(name: string, userId: string): Promise<string> {
  if (isAuthBypassed()) return `clerk_org_${randomUUID()}`;
  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  const org = await client.organizations.createOrganization({
    name,
    createdBy: userId,
  });
  return org.id;
}

// Writing a year of sample data takes a few seconds.
export const maxDuration = 60;

/** Redeem an activation code: creates the caller's demo organization. */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const limited = await enforceRateLimit({
    orgId: `user:${userId}`,
    bucket: "activate",
    limit: 5,
    windowMs: 10 * 60_000,
    message: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const raw = (body as { code?: unknown } | null)?.code;
  const normalized = typeof raw === "string" ? normalizeActivationCode(raw) : "";
  if (!isWellFormedActivationCode(normalized)) {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  const row = await prisma.activationCode.findUnique({
    where: { codeHash: hashActivationCode(normalized) },
  });
  if (!row) return NextResponse.json({ error: INVALID }, { status: 400 });

  const email = await getUserEmail();
  const check = checkRedeemable(row, email);
  if (!check.ok) {
    logger.warn("activation code rejected", { userId, reason: check.reason });
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  const now = new Date();
  // Claim first so two concurrent requests cannot both create an organization.
  const claimed = await prisma.activationCode.updateMany({
    where: { id: row.id, redeemedAt: null },
    data: { redeemedAt: now, redeemedByUserId: userId },
  });
  if (claimed.count !== 1) {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  try {
    const request_ = await prisma.demoRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { company: true },
    });
    const companyName = request_?.company || "Organisasi Demo";

    const clerkOrgId = await createClerkOrg(companyName, userId);
    const org = await prisma.organization.create({
      data: {
        clerkOrgId,
        name: companyName,
        slug: `org-${clerkOrgId.slice(-8).toLowerCase()}`,
        plan: "standard",
        trialEndsAt: addDays(now, row.trialDays),
        members: { create: { userId, role: "owner" } },
        settings: { create: { companyName } },
      },
      select: { id: true },
    });
    await prisma.activationCode.update({
      where: { id: row.id },
      data: { redeemedOrgId: org.id },
    });
    await prisma.demoRequest.updateMany({
      where: { userId, status: "pending" },
      data: { status: "approved" },
    });
    let seeded = false;
    if (row.withDemoData) {
      try {
        await seedDemoData(org.id, {
          ownerUserId: userId,
          ownerName: (await getDisplayName()) ?? undefined,
        });
        seeded = true;
      } catch (e) {
        // The org exists and the code is spent; the client can fill sample data from Settings.
        logger.error("demo data seed failed", { userId, orgId: org.id, error: String(e) });
      }
    }
    return NextResponse.json({ ok: true, clerkOrgId, withDemoData: row.withDemoData, seeded });
  } catch (e) {
    logger.error("activation failed", { userId, error: String(e) });
    // Release the code so the client can retry.
    await prisma.activationCode
      .update({
        where: { id: row.id },
        data: { redeemedAt: null, redeemedByUserId: null },
      })
      .catch(() => undefined);
    return NextResponse.json(
      { error: "Aktivasi gagal. Coba lagi atau hubungi kami." },
      { status: 500 }
    );
  }
}
