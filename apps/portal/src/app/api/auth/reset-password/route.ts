import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashUserPassword, hashTokenForLookup } from "@airegistry/sdk/server";
import { getConfig } from "@airegistry/sdk";
import { emailTemplates } from "@airegistry/sdk/server";
import { sendTransactionalEmail } from "@airegistry/sdk/server";
import { getPublicOrigin } from "@/lib/public-origin";
import { getReferenceRow } from "@airegistry/sdk/server";
import { writeAudit } from "@airegistry/sdk";

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
  const user = await prisma.user.findFirst({ where: { resetToken: tokenHash } });

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await hashUserPassword(body.password);

  // Receiving the reset email proves ownership of the address, so completing
  // a password reset doubles as email verification. Without this, an
  // unverified user who resets their password is stuck in a loop: login keeps
  // rejecting them with "Please verify your email" even after a successful
  // reset.
  const activeStatus = user.emailVerified
    ? null
    : await getReferenceRow("userStatusType", "active");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
      ...(activeStatus ? { statusId: activeStatus.id } : {})
    }
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "user",
    entityId: user.id,
    action: "user.password_reset"
  });

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
