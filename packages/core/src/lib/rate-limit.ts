/**
 * In-process sliding-window rate limiter for abuse-prone HTTP endpoints.
 *
 * Suitable for single-node deployments and dev. Behind multiple app instances,
 * combine with nginx `limit_req` or a shared store (Redis).
 */

export type RateLimitBucket = "auth" | "public-write";

const LIMITS: Record<RateLimitBucket, { windowMs: number; max: number }> = {
  /** Login, register, password reset, resend verification. */
  auth: { windowMs: 15 * 60 * 1000, max: 20 },
  /** Contact form, public report, complaint intake. */
  "public-write": { windowMs: 60 * 60 * 1000, max: 10 }
};

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function limitsFor(bucket: RateLimitBucket): { windowMs: number; max: number } {
  const base = LIMITS[bucket];
  if (bucket === "auth") {
    return {
      windowMs: envInt("RATE_LIMIT_AUTH_WINDOW_MS", base.windowMs),
      max: envInt("RATE_LIMIT_AUTH_MAX", base.max)
    };
  }
  return {
    windowMs: envInt("RATE_LIMIT_PUBLIC_WRITE_WINDOW_MS", base.windowMs),
    max: envInt("RATE_LIMIT_PUBLIC_WRITE_MAX", base.max)
  };
}

/** Best-effort client IP from reverse-proxy headers. */
export function clientIpFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export type RateLimitResult =
  | { allowed: true; remaining: number; limit: number; resetAt: number }
  | { allowed: false; retryAfterSec: number; limit: number; resetAt: number };

export function checkRateLimit(req: Request, bucket: RateLimitBucket): RateLimitResult {
  const { windowMs, max } = limitsFor(bucket);
  const key = `${bucket}:${clientIpFromRequest(req)}`;
  const now = Date.now();
  let entry = windows.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    windows.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      limit: max,
      resetAt: entry.resetAt
    };
  }
  return {
    allowed: true,
    remaining: Math.max(0, max - entry.count),
    limit: max,
    resetAt: entry.resetAt
  };
}

/** JSON 429 for generic handlers. */
export function rateLimitJsonResponse(result: Extract<RateLimitResult, { allowed: false }>): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0"
      }
    }
  );
}
