import { NextResponse } from "next/server";
import { isAuthBypassed, requireAuth } from "@/lib/auth";
import type { OrgRole } from "@/lib/org-roles";
import { prisma } from "@/lib/prisma";
import { isTrialExpired, trialExpiredResponse } from "@/lib/trial";
import {
  bypassOrgRole,
  ensureOrganizationMember,
  requireOrganization,
} from "@/lib/tenant-context";

type GuardSuccess = { userId: string; orgId: string; role: OrgRole };
type GuardFailure = { response: NextResponse };

export type GuardOptions = {
  /** Let an expired demo org through (data export and the trial-status check only). */
  allowExpired?: boolean;
};

export async function guardApiRoute(
  options: GuardOptions = {}
): Promise<GuardSuccess | GuardFailure> {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult;

  const orgResult = await requireOrganization();
  if ("response" in orgResult) return orgResult;

  const { userId, orgId } = {
    userId: authResult.userId,
    orgId: orgResult.orgId,
  };

  if (isAuthBypassed()) {
    return { userId, orgId, role: bypassOrgRole() };
  }

  if (!options.allowExpired) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { trialEndsAt: true },
    });
    if (isTrialExpired(org?.trialEndsAt)) {
      return { response: trialExpiredResponse() };
    }
  }

  const role = await ensureOrganizationMember(orgId, userId);
  return { userId, orgId, role };
}
