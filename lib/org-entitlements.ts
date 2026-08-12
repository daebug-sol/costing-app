import type { OrgPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { OrgModules } from "@/lib/org-modules";

export type { OrgPlan };

export type OrgEntitlements = {
  plan: OrgPlan;
  modules: OrgModules;
};

/** Free-tier usage caps (Standard/Enterprise: uncapped in this pass). */
export const FREE_LIMITS = {
  maxProjects: 2,
  maxQuotations: 3,
} as const;

export type PlanLimitedResource = "projects" | "quotations";

export async function getOrgEntitlements(
  orgId: string
): Promise<OrgEntitlements> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, ahuModuleEnabled: true },
  });
  return {
    plan: org?.plan ?? "free",
    modules: { ahu: org?.ahuModuleEnabled === true },
  };
}

export type AssertWithinPlanLimitsResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export async function assertWithinPlanLimits(
  orgId: string,
  resource: PlanLimitedResource
): Promise<AssertWithinPlanLimitsResult> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  });
  const plan = org?.plan ?? "free";
  if (plan !== "free") return { ok: true };

  const limit =
    resource === "projects"
      ? FREE_LIMITS.maxProjects
      : FREE_LIMITS.maxQuotations;

  const count =
    resource === "projects"
      ? await prisma.costingProject.count({
          where: { organizationId: orgId },
        })
      : await prisma.quotation.count({
          where: { organizationId: orgId },
        });

  if (count >= limit) {
    const label = resource === "projects" ? "projects" : "quotations";
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Free plan limit reached (${limit} ${label}). Upgrade to Standard to create more.`,
          code: "PLAN_LIMIT_REACHED",
          resource,
          limit,
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true };
}
