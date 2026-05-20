import { NextResponse } from "next/server";
import { checkRateLimit, type RateLimitBucket } from "@airegistry/core/rate-limit";

/**
 * Returns a 429 NextResponse when the client exceeds the bucket limit,
 * otherwise null so the route can continue.
 */
export function enforceRateLimit(req: Request, bucket: RateLimitBucket): NextResponse | null {
  const result = checkRateLimit(req, bucket);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0"
      }
    }
  );
}

export type { RateLimitBucket };
