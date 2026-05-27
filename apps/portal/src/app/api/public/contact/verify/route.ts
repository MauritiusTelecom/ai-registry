import { NextResponse } from "next/server";
import { hashTokenForLookup } from "@airegistry/sdk/server";
import { verifyContactSubmissionToken } from "@airegistry/sdk/server";

/**
 * GET /api/public/contact/verify?token=<raw>
 *
 * Marks the matching `Contacts` row as `emailVerified` and clears the
 * one-shot token. Idempotent for an already-verified row with no token
 * returns success when... actually we require token. Same semantics as
 * account email verification: invalid/expired → 400 JSON.
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("token");
  if (!raw) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const tokenHash = hashTokenForLookup(raw);
  const result = await verifyContactSubmissionToken(tokenHash);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  }
  return NextResponse.json(
    result.alreadyVerified
      ? { ok: true, email: result.email, alreadyVerified: true }
      : { ok: true, email: result.email }
  );
}
