import { NextResponse } from "next/server";
import { getConfig } from "@airegistry/sdk";
import { prisma } from "@/lib/prisma";
import { preparePasswordResetToken } from "@airegistry/sdk/server";
import { emailTemplates, sendEmail } from "@airegistry/sdk/server";
import { getPublicOrigin } from "@/lib/public-origin";

/**
 * POST /api/auth/request-reset
 *
 * Body: { email }
 *
 * Always returns 200 to prevent account-enumeration. When the email matches
 * a real user, a reset link is generated and emailed (or logged in dev).
 */

type RequestPayload = { email?: unknown };

export async function POST(req: Request) {
  let body: RequestPayload;
  try {
    body = (await req.json()) as RequestPayload;
  } catch {
    return NextResponse.json({ ok: true }); // generic
  }

  if (typeof body.email !== "string") {
    return NextResponse.json({ ok: true });
  }

  const email = body.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const { rawToken, hashedToken: tokenHash, expiry } = preparePasswordResetToken();

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: tokenHash, resetTokenExpiry: expiry }
  });

  const cfg = getConfig();
  const origin = getPublicOrigin(req);
  const resetUrl = `${origin}/auth/reset/${encodeURIComponent(rawToken)}`;
  const tmpl = emailTemplates.passwordReset({
    name: user.name,
    resetUrl,
    registryName: cfg.registryName
  });
  await sendEmail({ to: email, subject: tmpl.subject, text: tmpl.text });

  return NextResponse.json({
    ok: true,
    resetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined
  });
}
