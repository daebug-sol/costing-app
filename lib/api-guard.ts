import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requireOrganization } from "@/lib/tenant-context";

type GuardSuccess = { userId: string; orgId: string };
type GuardFailure = { response: NextResponse };

export async function guardApiRoute(): Promise<GuardSuccess | GuardFailure> {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult;

  const orgResult = await requireOrganization();
  if ("response" in orgResult) return orgResult;

  return { userId: authResult.userId, orgId: orgResult.orgId };
}
