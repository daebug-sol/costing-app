import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";

export type OperatorAuthSuccess = {
  ok: true;
  userId?: string;
  via: "api_key" | "user";
};

export type OperatorAuthFailure = {
  ok: false;
  response: NextResponse;
};

export type OperatorAuthResult = OperatorAuthSuccess | OperatorAuthFailure;

/** Comma-separated Clerk user IDs; empty / unset → no user can authenticate as operator. */
export function parseOperatorUserIds(): string[] {
  const raw = process.env.OPERATOR_USER_IDS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isOperatorUserId(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return parseOperatorUserIds().includes(userId);
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Compare against self so length mismatch still does constant-ish work.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Fail-closed: unset or empty OPERATOR_API_KEY never authenticates.
 * Expects `Authorization: Bearer <key>`.
 */
export function isOperatorApiKey(request: Request): boolean {
  const expected = process.env.OPERATOR_API_KEY ?? "";
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  if (!match) return false;

  return timingSafeEqualStrings(match[1], expected);
}

/**
 * Platform operator gate (cross-tenant). Call before any DB access.
 * Accepts valid OPERATOR_API_KEY Bearer **or** signed-in user in OPERATOR_USER_IDS.
 */
export async function requireOperator(
  request: Request
): Promise<OperatorAuthResult> {
  if (isOperatorApiKey(request)) {
    return { ok: true, via: "api_key" };
  }

  const userId = await getSessionUserId();
  if (userId && isOperatorUserId(userId)) {
    return { ok: true, userId, via: "user" };
  }

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}
