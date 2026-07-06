/**
 * Simple in-memory rate limiter for expensive API routes.
 * When UPSTASH_REDIS_REST_URL is set, Upstash can be wired in a future iteration.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function checkRateLimit(
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

export function rateLimitKey(parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(":");
}
