import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { issueSessionToken, sessionCookieAttributes } from "@/lib/auth/session";
import { generateRawToken, hashToken, verificationExpiry } from "@/lib/auth/tokens";
import { emailTemplates, sendEmail } from "@/lib/email";
import { linkContactsToUser } from "@/lib/contacts/link-to-user";
import { portalForRole } from "@/lib/portals/auth-gate";

/**
 * POST /api/auth/register
 *
 * Body: { email, password, name, organisationName? }
 *
 * Creates a User row with role=`provider`, status=`invited`, emailVerified=false,
 * a verification token, and immediately starts a session so the user lands on
 * the protected onboarding page. The verification email is sent (or logged in
 * dev). 409 on duplicate email.
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

  const passwordHash = await hashPassword(body.password as string);
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiry = verificationExpiry();

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
  const origin = new URL(req.url).origin;
  const verifyUrl = `${origin}/auth/verify?token=${encodeURIComponent(rawToken)}`;
  const tmpl = emailTemplates.verification({
    name,
    verifyUrl,
    registryName: cfg.registryName
  });
  await sendEmail({ to: email, subject: tmpl.subject, text: tmpl.text });

  // Issue session immediately so the new user lands on /portal.
  const token = issueSessionToken(user.id);
  const attrs = sessionCookieAttributes();
  const jar = await cookies();
  jar.set(attrs.name, token, {
    httpOnly: attrs.httpOnly,
    secure: attrs.secure,
    sameSite: attrs.sameSite,
    path: attrs.path,
    maxAge: attrs.maxAge
  });

  return NextResponse.json(
    {
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, emailVerified: false },
      // New providers land on /provider; future support for self-registering
      // other roles plugs in here via portalForRole().
      redirectTo: portalForRole(providerRole.code),
      verifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined
    },
    { status: 201 }
  );
}
