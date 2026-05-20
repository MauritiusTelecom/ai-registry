import { NextResponse } from "next/server";
import { getConfig } from "@airegistry/sdk";
import { prisma } from "@/lib/prisma";
import {
  hashUserPassword,
  prepareEmailVerificationToken
} from "@airegistry/sdk/server";
import { emailTemplates, sendEmail } from "@airegistry/sdk/server";
import { linkContactsToUser } from "@airegistry/sdk/server";
import { getPublicOrigin } from "@/lib/public-origin";
import { writeAudit } from "@airegistry/sdk";
import {
  exposeDevAuthLinks,
  findUserByEmail,
  createSelfRegisteredUser
} from "@airegistry/sdk/server";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/auth/register
 *
 * Body: { email, password, name, organisationName? }
 *
 * Creates a User row with role=`provider`, status=`invited`, emailVerified=false,
 * and a verification token, then emails a verification link. No session is
 * issued — the new account cannot access the provider portal until the
 * email is verified and the user signs in. Duplicate email returns the same
 * 201 acknowledgement as a new registration (anti-enumeration).
 */

type RegisterPayload = {
  email?: unknown;
  password?: unknown;
  name?: unknown;
  organisationName?: unknown;
};

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^\S+@\S+\.\S+$/.test(v);
}

const REGISTER_ACK = {
  ok: true as const,
  redirectTo: "/login?registered=1",
  message:
    "If this email is eligible for an account, check your inbox for a verification link."
};

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "auth");
  if (limited) return limited;

  let body: RegisterPayload;
  try {
    body = (await req.json()) as RegisterPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors: string[] = [];
  if (!isEmail(body.email)) errors.push("email must be valid");
  if (typeof body.password !== "string" || body.password.length < 8) {
    errors.push("password must be at least 8 characters");
  }
  if (typeof body.name !== "string" || body.name.trim().length < 2) {
    errors.push("name is required");
  }
  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  const email = (body.email as string).toLowerCase().trim();
  const name = (body.name as string).trim();
  const organisationName =
    typeof body.organisationName === "string" && body.organisationName.trim() !== ""
      ? body.organisationName.trim()
      : null;

  // Pre-flight dup check before creating — lets us return a precise 409
  // separately from the "ref data not seeded" 503 the service raises.
  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json(REGISTER_ACK, { status: 201 });
  }

  const passwordHash = await hashUserPassword(body.password as string);
  const { rawToken, hashedToken: tokenHash, expiry } = prepareEmailVerificationToken();

  let user: { id: string; email: string; name: string };
  try {
    user = await createSelfRegisteredUser({
      email,
      passwordHash,
      name,
      organisationName,
      verificationTokenHash: tokenHash,
      verificationTokenExpiry: expiry
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    );
  }

  // Audit (Phase 4 will add a richer wrapper; for Phase 2 we write a raw row
  // through the existing AuditLog model so the trail starts on day one).
  await writeAudit({
    actorUserId: user.id,
    entityType: "user",
    entityId: user.id,
    action: "user.registered",
    newValue: { email, name, organisationName, role: "provider" }
  });

  const linkedContacts = await linkContactsToUser(prisma, email, user.id);
  if (linkedContacts > 0) {
    await writeAudit({
      actorUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "user.contact_submissions_linked",
      newValue: { count: linkedContacts, email }
    });
  }

  // Email verification link.
  const cfg = getConfig();
  const origin = getPublicOrigin(req);
  const verifyUrl = `${origin}/auth/verify?token=${encodeURIComponent(rawToken)}`;
  const tmpl = emailTemplates.verification({
    name,
    verifyUrl,
    registryName: cfg.registryName
  });
  await sendEmail({ to: email, subject: tmpl.subject, text: tmpl.text });

  // No session is issued. The user must open the verification link from their
  // inbox and then sign in. The frontend should route them to
  // /login?registered=1 which renders a "check your email" confirmation.
  return NextResponse.json(
    {
      ...REGISTER_ACK,
      user: { id: user.id, email: user.email, name: user.name, emailVerified: false },
      ...(exposeDevAuthLinks() ? { verifyUrl } : {})
    },
    { status: 201 }
  );
}
