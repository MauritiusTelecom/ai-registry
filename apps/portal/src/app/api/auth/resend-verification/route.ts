import { NextResponse } from "next/server";
import { getConfig } from "@airegistry/sdk";
import { prepareEmailVerificationToken } from "@airegistry/sdk/server";
import { emailTemplates, sendEmail } from "@airegistry/sdk/server";
import { getPublicOrigin } from "@/lib/public-origin";
import { writeAudit } from "@airegistry/sdk";
import { exposeDevAuthLinks, findUserByEmail, setUserVerificationToken } from "@airegistry/sdk/server";
import { enforceRateLimit } from "@/lib/rate-limit";

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
  const limited = enforceRateLimit(req, "auth");
  if (limited) return limited;

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
  const user = await findUserByEmail(email);

  // Silently no-op for unknown emails or already-verified accounts so the
  // response shape never reveals account state.
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  const { rawToken, hashedToken: tokenHash, expiry } = prepareEmailVerificationToken();

  await setUserVerificationToken(user.id, tokenHash, expiry);

  await writeAudit({
    actorUserId: user.id,
    entityType: "user",
    entityId: user.id,
    action: "user.verification_resent",
    newValue: { email }
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
    ...(exposeDevAuthLinks() ? { verifyUrl } : {})
  });
}
