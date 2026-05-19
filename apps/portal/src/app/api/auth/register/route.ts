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

/**
 * POST /api/auth/register
 *
 * Body: { email, password, name, organisationName? }
 *
 * Creates a User row with role=`provider`, status=`invited`, emailVerified=false,
 * and a verification token, then emails a verification link. No session is
 * issued — the new account cannot access the provider portal until the
 * email is verified and the user signs in. 409 on duplicate email.
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

export async function POST(req: Request) {
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

  // Look up canonical role + status ids (seeded by Phase 1).
  const [providerRole, invitedStatus] = await Promise.all([
    prisma.userRoleType.findUnique({ where: { code: "provider" } }),
    prisma.userStatusType.findUnique({ where: { code: "invited" } })
  ]);
  if (!providerRole || !invitedStatus) {
    return NextResponse.json(
      { error: "Reference data not seeded (run npm run db:seed)." },
      { status: 503 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Don't leak the registration state - but do let the user try to log in.
    return NextResponse.json(
      { error: "An account with this email already exists. Try logging in." },
      { status: 409 }
    );
  }

  const passwordHash = await hashUserPassword(body.password as string);
  const { rawToken, hashedToken: tokenHash, expiry } = prepareEmailVerificationToken();

  const user = await prisma.user.create({
    data: {
      email,
      name,
      organisationName,
      passwordHash,
      roleId: providerRole.id,
      statusId: invitedStatus.id,
      emailVerified: false,
      verificationToken: tokenHash,
      verificationTokenExpiry: expiry,
      onboardingComplete: false
    }
  });

  // Audit (Phase 4 will add a richer wrapper; for Phase 2 we write a raw row
  // through the existing AuditLog model so the trail starts on day one).
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "user.registered",
      newValue: { email, name, organisationName, role: "provider" }
    }
  });

  const linkedContacts = await linkContactsToUser(prisma, email, user.id);
  if (linkedContacts > 0) {
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        entityType: "user",
        entityId: user.id,
        action: "user.contact_submissions_linked",
        newValue: { count: linkedContacts, email }
      }
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
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, emailVerified: false },
      redirectTo: "/login?registered=1",
      verifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined
    },
    { status: 201 }
  );
}
