import { NextResponse } from "next/server";
import { getConfig } from "@airegistry/sdk";
import { prisma } from "@/lib/prisma";
import { generateRawToken, hashToken, verificationExpiry } from "@/lib/auth/tokens";
import { emailTemplates, sendEmail } from "@/lib/email";
import { getPublicOrigin } from "@/lib/public-origin";

/**
 * POST /api/auth/resend-verification
 *
 * Body: { email }
 *
 * Always returns 200 to prevent account-enumeration. When the email matches
 * a real, *unverified* user, a fresh verification token is generated, the
 * previous token is rotated out, and a new verification email is sent (or
 * logged in dev). Verified or unknown emails are silently ignored.
 *
 * Mirrors the design of `/api/auth/request-reset`.
 */

type RequestPayload = { email?: unknown };

export async function POST(req: Request) {
  let body: RequestPayload;
  try {
    body = (await req.json()) as RequestPayload;
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (typeof body.email !== "string") {
    return NextResponse.json({ ok: true });
  }

  const email = body.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // Silently no-op for unknown emails or already-verified accounts so the
  // response shape never reveals account state.
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiry = verificationExpiry();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationToken: tokenHash,
      verificationTokenExpiry: expiry
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "user.verification_resent",
      newValue: { email }
    }
  });

  const cfg = getConfig();
  const origin = getPublicOrigin(req);
  const verifyUrl = `${origin}/auth/verify?token=${encodeURIComponent(rawToken)}`;
  const tmpl = emailTemplates.verification({
    name: user.name,
    verifyUrl,
    registryName: cfg.registryName
  });
  await sendEmail({ to: email, subject: tmpl.subject, text: tmpl.text });

  return NextResponse.json({
    ok: true,
    verifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined
  });
}
