import { NextResponse } from "next/server";
import { consumeEmailVerificationToken } from "@airegistry/sdk/server";

/**
 * GET /api/auth/verify-email?token=<raw>
 *
 * Looks up the user whose `verificationToken` matches `sha256(raw)` and
 * `verificationTokenExpiry > now`. On match: marks `emailVerified = true`,
 * clears the token, promotes status to `active`, writes the audit row.
 * The page at `/auth/verify` calls the same `consumeEmailVerificationToken`
 * service so behaviour is identical across both entry points.
 *
 * Always returns JSON; never reveals whether a token *previously* existed.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("token");
  if (!raw) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }
  const result = await consumeEmailVerificationToken(raw);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, email: result.email });
}
