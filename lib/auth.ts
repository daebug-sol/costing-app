import { NextResponse } from "next/server";

/**
 * Auth bypass is for local dev, jest and CI only. It never applies on a hosted
 * Vercel deployment (production or preview), whatever the env vars say.
 * Single source of truth: `proxy.ts` and the API guards both call this.
 */
export function isAuthBypassed(): boolean {
  if (process.env.VERCEL) return false;
  if (process.env.AUTH_BYPASS === "true") return true;
  if (process.env.NODE_ENV === "test") return true;
  // Implicit fallback only in `next dev` without Clerk keys; an unset or
  // unknown NODE_ENV must not silently disable auth.
  return process.env.NODE_ENV === "development" && !process.env.CLERK_SECRET_KEY;
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

/** Signed-in user's display name (used to match `Quotation.salesman`); null when unknown. */
export async function getDisplayName(): Promise<string | null> {
  if (isAuthBypassed()) {
    return process.env.TEST_USER_NAME?.trim() || null;
  }
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  if (!user) return null;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.username || null;
}

/** Signed-in user's primary email (lowercased); null when unknown. */
export async function getUserEmail(): Promise<string | null> {
  if (isAuthBypassed()) {
    return process.env.TEST_USER_EMAIL?.trim().toLowerCase() || null;
  }
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  return email ? email.trim().toLowerCase() : null;
}
