import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/operator-auth";
import {
  isOrgPlan,
  resolveOperatorOrgPatch,
} from "@/lib/operator-org-patch";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const orgSelect = {
  id: true,
  name: true,
  slug: true,
  plan: true,
  ahuModuleEnabled: true,
  trialEndsAt: true,
  createdAt: true,
} as const;

type RouteContext = { params: Promise<{ id: string }> };

/** Get one org by id (operator only). */
export async function GET(request: Request, context: RouteContext) {
  const auth = await requireOperator(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const org = await prisma.organization.findUnique({
      where: { id },
      select: orgSelect,
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    return NextResponse.json(org);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load organization" },
      { status: 500 }
    );
  }
}

/** Update plan / AHU module for any org (operator only). */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireOperator(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const hasPlan = Object.prototype.hasOwnProperty.call(raw, "plan");
  const hasAhu = Object.prototype.hasOwnProperty.call(raw, "ahuModuleEnabled");

  const hasTrial = Object.prototype.hasOwnProperty.call(raw, "trialEndsAt");

  if (!hasPlan && !hasAhu && !hasTrial) {
    return NextResponse.json(
      { error: "Provide plan, ahuModuleEnabled and/or trialEndsAt" },
      { status: 400 }
    );
  }

  if (hasPlan && !isOrgPlan(raw.plan)) {
    return NextResponse.json(
      { error: "plan must be free, standard, or enterprise" },
      { status: 400 }
    );
  }

  if (hasAhu && typeof raw.ahuModuleEnabled !== "boolean") {
    return NextResponse.json(
      { error: "ahuModuleEnabled must be a boolean" },
      { status: 400 }
    );
  }

  // null ends the demo (paid/legacy org); an ISO date sets or extends it.
  let trialEndsAt: Date | null | undefined;
  if (hasTrial) {
    if (raw.trialEndsAt === null) {
      trialEndsAt = null;
    } else if (
      typeof raw.trialEndsAt === "string" &&
      !Number.isNaN(Date.parse(raw.trialEndsAt))
    ) {
      trialEndsAt = new Date(raw.trialEndsAt);
    } else {
      return NextResponse.json(
        { error: "trialEndsAt must be an ISO date or null" },
        { status: 400 }
      );
    }
  }

  try {
    const current = await prisma.organization.findUnique({
      where: { id },
      select: { plan: true, ahuModuleEnabled: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const resolved = resolveOperatorOrgPatch(current, {
      plan: hasPlan && isOrgPlan(raw.plan) ? raw.plan : undefined,
      ahuModuleEnabled:
        hasAhu && typeof raw.ahuModuleEnabled === "boolean"
          ? raw.ahuModuleEnabled
          : undefined,
    });

    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error, code: resolved.code },
        { status: 400 }
      );
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        ...resolved.data,
        ...(trialEndsAt !== undefined ? { trialEndsAt } : {}),
      },
      select: orgSelect,
    });

    logger.info("operator.org.patch", {
      route: "/api/operator/orgs/[id]",
      orgId: id,
      userId: auth.userId,
      via: auth.via,
      plan: updated.plan,
      ahuModuleEnabled: updated.ahuModuleEnabled,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}
