import { NextResponse } from "next/server";

export function isAuthBypassed(): boolean {
  return (
    process.env.AUTH_BYPASS === "true" ||
    process.env.NODE_ENV === "test" ||
    (!process.env.CLERK_SECRET_KEY && process.env.NODE_ENV !== "production")
  );
}

export async function getSessionUserId(): Promise<string | null> {
  if (isAuthBypassed()) {
    return process.env.TEST_USER_ID ?? "test-user-id";
  }

  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  return userId;
}

type AuthSuccess = { userId: string };
type AuthFailure = { response: NextResponse };

export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId };
}

export async function getClerkOrgId(): Promise<string | null> {
  if (isAuthBypassed()) {
    return process.env.TEST_CLERK_ORG_ID ?? "clerk_org_test";
  }

  const { auth } = await import("@clerk/nextjs/server");
  const { orgId } = await auth();
  return orgId ?? null;
}
