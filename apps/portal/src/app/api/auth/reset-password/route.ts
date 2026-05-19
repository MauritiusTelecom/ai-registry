import { NextResponse } from "next/server";
import { hashUserPassword, hashTokenForLookup } from "@airegistry/sdk/server";
import { getConfig } from "@airegistry/sdk";
import { emailTemplates } from "@airegistry/sdk/server";
import { sendTransactionalEmail } from "@airegistry/sdk/server";
import { getPublicOrigin } from "@/lib/public-origin";
import { writeAudit } from "@airegistry/sdk";
import { findUserByResetTokenHash, applyPasswordReset } from "@airegistry/sdk/server";

/**
 * POST /api/auth/reset-password
 *
 * Body: { token, password }
 *
 * Verifies the token (sha256-hashed lookup + non-expired), updates the user's
 * password, clears the reset token, and writes an audit row.
 */

type ResetPayload = { token?: unknown; password?: unknown };

export async function POST(req: Request) {
  const origin = getPublicOrigin(req);
  let body: ResetPayload;
  try {
    body = (await req.json()) as ResetPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.token !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "token and password are required" }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const tokenHash = hashTokenForLookup(body.token);
  const user = await findUserByResetTokenHash(tokenHash);
  if (!user) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await hashUserPassword(body.password);
  // Receiving the reset email proves ownership of the address, so completing
  // a password reset doubles as email verification. The service writes the
  // audit row internally (constitution §6).
  await applyPasswordReset(user.id, passwordHash, { promoteToActive: !user.emailVerified });

  const cfg = getConfig();
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const tmpl = emailTemplates.passwordChanged({
    name: firstName,
    registryName: cfg.registryName,
    loginUrl: `${origin}/login`
  });
  sendTransactionalEmail("password_changed", {
    to: user.email,
    subject: tmpl.subject,
    text: tmpl.text
  });

  return NextResponse.json({ ok: true });
}
