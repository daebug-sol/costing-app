import { NextResponse } from "next/server";

/**
 * Fixed-window rate limiter for expensive API routes.
 *
 * With UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set, counters live in
 * Redis and are shared by every serverless instance. Otherwise (local dev, CI)
 * an in-memory map is used, which only limits within a single instance. If
 * Upstash is unreachable we fall back to the in-memory limiter rather than
 * failing the request.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

const UPSTASH_TIMEOUT_MS = 1500;

function checkMemory(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
    return { ok: false, retryAfterSec };
  }

  existing.count += 1;
  return { ok: true };
}

type UpstashReply = { result?: number; error?: string };

async function upstashPipeline(
  url: string,
  token: string,
  commands: (string | number)[][]
): Promise<UpstashReply[]> {
  const res = await fetch(`${url.replace(/\/+$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Upstash responded ${res.status}`);
  const replies = (await res.json()) as UpstashReply[];
  const failed = replies.find((r) => r.error);
  if (failed) throw new Error(`Upstash error: ${failed.error}`);
  return replies;
}

async function checkUpstash(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  const [incr, , pttl] = await upstashPipeline(url, token, [
    ["INCR", redisKey],
    ["PEXPIRE", redisKey, windowMs, "NX"],
    ["PTTL", redisKey],
  ]);

  const count = incr.result ?? 0;
  let ttlMs = pttl.result ?? windowMs;
  if (ttlMs < 0) {
    // Key exists without an expiry (e.g. a crash between INCR and PEXPIRE).
    await upstashPipeline(url, token, [["PEXPIRE", redisKey, windowMs]]);
    ttlMs = windowMs;
  }

  if (count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(ttlMs / 1000)) };
  }
  return { ok: true };
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      return await checkUpstash(url, token, key, limit, windowMs);
    } catch (e) {
      console.error("Rate limiter: Upstash unavailable, using in-memory", e);
    }
  }
  return checkMemory(key, limit, windowMs);
}

export function rateLimitKey(parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(":");
}

/**
 * Per-organization limit for one bucket. Returns a 429 response when the
 * limit is exceeded, otherwise null.
 */
export async function enforceRateLimit(opts: {
  orgId: string;
  bucket: string;
  limit: number;
  windowMs: number;
  message?: string;
}): Promise<NextResponse | null> {
  const rate = await checkRateLimit(
    rateLimitKey([opts.orgId, opts.bucket]),
    opts.limit,
    opts.windowMs
  );
  if (rate.ok) return null;
  return NextResponse.json(
    { error: opts.message ?? "Too many requests" },
    { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
  );
}

/** Test helper: clears the in-memory buckets. */
export function resetRateLimitMemory(): void {
  buckets.clear();
}
