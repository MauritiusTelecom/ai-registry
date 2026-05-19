import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  verifyUserPassword,
  NO_USER_PASSWORD_SENTINEL,
  signSessionCookie,
  findUserForLogin
} from "@airegistry/sdk/server";
import { linkContactsToUser } from "@airegistry/sdk/server";
import { portalForRole } from "@/lib/portals/auth-gate";
import { writeAudit } from "@airegistry/sdk";

/**
 * POST /api/auth/login
 *
 * Body: { email, password }
 *
 * On success, sets the session cookie and returns the user envelope.
 * On failure, returns 401 with a generic message - never reveals whether
 * the email exists. When credentials are correct but the email has not yet
 * been verified, returns 403 with `code: "email_not_verified"` so the UI
 * can render a tailored message + a "Resend verification" button.
 */

type LoginPayload = { email?: unknown; password?: unknown };

const GENERIC_ERROR = "Email or password is incorrect.";

export async function POST(req: Request) {
  let body: LoginPayload;
  try {
    body = (await req.json()) as LoginPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const email = body.email.toLowerCase().trim();
  const user = await findUserForLogin(email);

  // Always attempt a hash compare even when the user doesn't exist, so the
  // observable timing is similar in both branches.
  const stored = user?.passwordHash ?? NO_USER_PASSWORD_SENTINEL;
  const ok = await verifyUserPassword(body.password, stored);

  if (!user || !ok || user.statusCode === "deactivated" || user.statusCode === "suspended") {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  // Credentials are valid - but if the email has not been verified yet we
  // refuse to issue a session. The frontend renders a tailored message and
  // a "Resend verification email" affordance keyed off `code`.
  if (!user.emailVerified) {
    return NextResponse.json(
      {
        error: "Please verify your email address to sign in.",
        code: "email_not_verified",
        email: user.email
      },
      { status: 403 }
    );
  }

  const { name, value, ...cookieAttrs } = signSessionCookie(user.id);
  const jar = await cookies();
  jar.set(name, value, cookieAttrs);

  await writeAudit({
    actorUserId: user.id,
    entityType: "user",
    entityId: user.id,
    action: "user.login",
    newValue: { ip: req.headers.get("x-forwarded-for") ?? null }
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

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        role: user.roleCode,
        status: user.statusCode
      },
      // Role-based default landing - clients use this when no `next=` query
      // param was set on the /login page.
      redirectTo: portalForRole(user.roleCode)
    },
    { status: 200 }
  );
}
