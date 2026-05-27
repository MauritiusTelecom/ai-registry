import { NextResponse } from "next/server";
import { getConfig } from "@airegistry/sdk";
import { preparePasswordResetToken } from "@airegistry/sdk/server";
import { emailTemplates, sendEmail } from "@airegistry/sdk/server";
import { getPublicOrigin } from "@/lib/public-origin";
import { exposeDevAuthLinks, findUserByEmail, setUserResetToken } from "@airegistry/sdk/server";
import { enforceRateLimit } from "@/lib/rate-limit";

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
  const limited = enforceRateLimit(req, "auth");
  if (limited) return limited;

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
  const user = await findUserByEmail(email);

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const { rawToken, hashedToken: tokenHash, expiry } = preparePasswordResetToken();

  await setUserResetToken(user.id, tokenHash, expiry);

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
    ...(exposeDevAuthLinks() ? { resetUrl } : {})
  });
}
