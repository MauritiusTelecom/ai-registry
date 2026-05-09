import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { generateRawToken, hashToken, resetExpiry } from "@/lib/auth/tokens";
import { emailTemplates, sendEmail } from "@/lib/email";

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

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiry = resetExpiry();

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: tokenHash, resetTokenExpiry: expiry }
  });

  const cfg = getConfig();
  const origin = new URL(req.url).origin;
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
