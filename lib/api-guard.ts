import { NextResponse } from "next/server";
import { isAuthBypassed, requireAuth } from "@/lib/auth";
import type { OrgRole } from "@/lib/org-roles";
import {
  bypassOrgRole,
  ensureOrganizationMember,
  requireOrganization,
} from "@/lib/tenant-context";

type GuardSuccess = { userId: string; orgId: string; role: OrgRole };
type GuardFailure = { response: NextResponse };

export async function guardApiRoute(): Promise<GuardSuccess | GuardFailure> {
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

  const role = await ensureOrganizationMember(orgId, userId);
  return { userId, orgId, role };
}
