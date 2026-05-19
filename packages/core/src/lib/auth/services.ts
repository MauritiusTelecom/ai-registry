/**
 * Auth service helpers.
 *
 * The crypto primitives in `password.ts`, `tokens.ts`, and `session.ts`
 * are INTERNAL — apps and extensions MUST NOT import them directly. This
 * file exposes a higher-level surface that hides the primitives behind
 * task-shaped helpers, so the route handlers (and any third-party portal
 * built on AIR-Core) don't end up doing their own crypto.
 *
 * Re-exported via `@airegistry/sdk/server`.
 *
 * Design intent (Phase 6.1 PR 8):
 *   - Authentication flows compose these helpers; they do not call
 *     hashPassword / verifyPassword / generateRawToken / hashToken /
 *     issueSessionToken / sessionCookieAttributes directly.
 *   - Each helper is intentionally "thin" — it bundles the 2–4
 *     primitives that always travel together, but does NOT take over the
 *     route's Prisma writes, email sends, or audit calls. Those remain
 *     under the route's control so behaviour is unchanged.
 *
 * Constitution alignment:
 *   - §1 (Registry points; environment secures): keeping crypto in core
 *     ensures the same posture across deployments and forks.
 *   - §7 (Separation of duties): session issuance and password hashing
 *     are governance-adjacent; centralising them prevents inconsistent
 *     posture across routes.
 */

import { hashPassword, verifyPassword } from "./password";
import {
  generateRawToken,
  hashToken,
  verificationExpiry,
  resetExpiry
} from "./tokens";
import {
  issueSessionToken,
  sessionCookieAttributes
} from "./session";

// ----- Session cookie directives -----

/**
 * A serialisable description of a Set-Cookie directive. Routes pass this
 * shape to `cookies().set(...)` (or set it on a `NextResponse`).
 */
export type SessionCookieDirective = {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

/**
 * Sign a fresh session token for `userId` and return the cookie directive
 * the route should set. Combines `issueSessionToken` + `sessionCookieAttributes`.
 */
export function signSessionCookie(userId: string, now: Date = new Date()): SessionCookieDirective {
  const token = issueSessionToken(userId, now);
  const attrs = sessionCookieAttributes();
  return {
    name: attrs.name,
    value: token,
    httpOnly: attrs.httpOnly,
    secure: attrs.secure,
    sameSite: attrs.sameSite,
    path: attrs.path,
    maxAge: attrs.maxAge
  };
}

/**
 * Return a cookie directive that clears the session cookie. Routes pass
 * this to `cookies().set(...)` on logout (or whenever the session must end).
 */
export function clearSessionCookie(): SessionCookieDirective {
  const attrs = sessionCookieAttributes();
  return {
    name: attrs.name,
    value: "",
    httpOnly: attrs.httpOnly,
    secure: attrs.secure,
    sameSite: attrs.sameSite,
    path: attrs.path,
    maxAge: 0
  };
}

// ----- Password hashing -----

/** Hash a plaintext password for storage. Throws if `< 8` characters. */
export async function hashUserPassword(plain: string): Promise<string> {
  return hashPassword(plain);
}

/**
 * Verify a candidate password against a stored hash.
 *
 * Callers handling login MUST use `NO_USER_PASSWORD_SENTINEL` as the
 * stored hash when the user doesn't exist, so the observable timing
 * matches the user-exists branch. (See `authenticateAndIssueSession`
 * usage in `apps/portal/src/app/api/auth/login/route.ts`.)
 */
export async function verifyUserPassword(plain: string, storedHash: string): Promise<boolean> {
  return verifyPassword(plain, storedHash);
}

/**
 * A pre-baked scrypt-shaped sentinel used for the "no such user" branch
 * of login, so the hash compare runs on both paths. The value is fixed
 * (not generated per request) because the timing concern is the scrypt
 * work, not the salt.
 */
export const NO_USER_PASSWORD_SENTINEL = "scrypt$N=16384,r=8,p=1$AAAA$AAAA";

// ----- One-shot tokens (email verification, password reset) -----

/**
 * The three values that always travel together when issuing a one-shot
 * email or password-reset token:
 *
 *   - `rawToken`: the URL-safe value embedded in the link sent to the user.
 *   - `hashedToken`: the sha256 hash stored in the DB so a leaked row does
 *     not leak a usable link.
 *   - `expiry`: the absolute expiry timestamp the DB should record.
 */
export type OneShotTokenBundle = {
  rawToken: string;
  hashedToken: string;
  expiry: Date;
};

/** Generate a fresh email-verification token bundle (24h TTL). */
export function prepareEmailVerificationToken(): OneShotTokenBundle {
  const raw = generateRawToken();
  return {
    rawToken: raw,
    hashedToken: hashToken(raw),
    expiry: verificationExpiry()
  };
}

/** Generate a fresh password-reset token bundle (1h TTL). */
export function preparePasswordResetToken(): OneShotTokenBundle {
  const raw = generateRawToken();
  return {
    rawToken: raw,
    hashedToken: hashToken(raw),
    expiry: resetExpiry()
  };
}

/**
 * Hash a raw token for DB lookup. Use this when an inbound URL contains
 * the raw token and the route needs to look up the matching row by its
 * hashed column.
 */
export function hashTokenForLookup(raw: string): string {
  return hashToken(raw);
}

// ─── Email verification token consumption (governance write) ────────────

import { prisma } from "../prisma";
import { writeAudit } from "../audit/write-audit";
import { getConfig } from "../config";
import {
  listReferenceTable,
  getReferenceRow
} from "../services/reference";

export type ConsumeEmailVerificationResult =
  | { ok: true; email: string }
  | { ok: false; reason: "expired_or_invalid" };

/**
 * Consume an email-verification token. If the token matches a non-expired
 * user row, mark `emailVerified = true`, clear the token, promote status
 * from `invited` to `active` (when that ref-row exists), and write an
 * audit row. Idempotent in the sense that a second call returns
 * "expired_or_invalid" because the token is cleared.
 *
 * Used by:
 *   - GET /api/auth/verify-email
 *   - The inline /auth/verify/page.tsx server page (which performs the same
 *     transition so the user sees the outcome on the first paint).
 */
export async function consumeEmailVerificationToken(
  rawToken: string
): Promise<ConsumeEmailVerificationResult> {
  const tokenHash = hashToken(rawToken);
  const user = await prisma.user.findFirst({
    where: { verificationToken: tokenHash }
  });
  if (!user || !user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
    return { ok: false, reason: "expired_or_invalid" };
  }
  // Promote status from `invited` → `active` if the active ref-row exists.
  const activeStatus = await prisma.userStatusType.findUnique({
    where: { code: "active" }
  });
  await prisma.user.update({
    where: { id: user.id },
    data: {
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
    action: "user.email_verified"
  });
  return { ok: true, email: user.email };
}

// ─── Provider workspace creation (Phase 4 governance write) ────────────

function slugifyLocalPart(email: string): string {
  const local = email.split("@")[0] ?? "provider";
  const s = local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s.length >= 2 ? s : "provider";
}

async function uniqueProviderSlug(base: string): Promise<string> {
  let candidate = base;
  let n = 0;
  for (;;) {
    const clash = await prisma.provider.findUnique({ where: { slug: candidate } });
    if (!clash) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

/**
 * Link a self-registered provider-role user to a Provider row, creating one
 * if missing. Idempotent — returns the user's existing providerId when
 * already linked. The Provider row is created in `unverified` /
 * `self_submitted` status (constitution §7: providers self-submit, only
 * authorised governance grants elevation).
 *
 * The Provider create + User.providerId update run inside a single
 * `prisma.$transaction` so a partial link can never strand the user.
 */
export async function ensureProviderWorkspace(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  });
  if (!user) throw new Error("User not found");
  if (user.role.code !== "provider") {
    throw new Error("Only provider-role users can be linked to a provider organisation");
  }
  if (user.providerId) return user.providerId;

  const cfg = getConfig();
  const [jurisdiction, type, status, src] = await Promise.all([
    getReferenceRow("jurisdiction", cfg.jurisdiction),
    getReferenceRow("providerTypeRef", "integrator"),
    getReferenceRow("providerStatusType", "unverified"),
    getReferenceRow("submissionSourceType", "self_submitted")
  ]);
  if (!jurisdiction || !type || !status || !src) {
    throw new Error("Reference data not seeded (run npm run db:seed).");
  }

  const displayName = user.organisationName?.trim() || user.name || user.email;
  const baseSlug = slugifyLocalPart(user.email);
  const slug = await uniqueProviderSlug(baseSlug);

  const provider = await prisma.$transaction(async (tx) => {
    const p = await tx.provider.create({
      data: {
        slug,
        displayName,
        legalName: displayName,
        typeId: type.id,
        homeJurisdictionId: jurisdiction.id,
        contactEmail: user.email,
        statusId: status.id,
        srcId: src.id,
        published: false,
        description: `Self-registered provider workspace for ${user.email}.`
      }
    });
    await tx.user.update({
      where: { id: userId },
      data: { providerId: p.id }
    });
    return p;
  });

  await writeAudit({
    actorUserId: userId,
    entityType: "provider",
    entityId: provider.id,
    action: "provider.workspace_created",
    newValue: { slug: provider.slug, displayName: provider.displayName }
  });

  return provider.id;
}

// Silence unused-import warning when `listReferenceTable` isn't called
// elsewhere in this file — kept for future helpers.
void listReferenceTable;

// ─── User lookup + write helpers (PR 13E auth routes) ──────────────────

export type UserForLogin = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  emailVerified: boolean;
  roleCode: string;
  statusCode: string;
};

/**
 * Look up a user by email, returning the minimal projection the login flow
 * needs (role + status codes flattened). Returns null when the email is
 * unknown — the route applies a timing-safe sentinel hash before reporting
 * a generic error to avoid account-enumeration.
 */
export async function findUserForLogin(email: string): Promise<UserForLogin | null> {
  const u = await prisma.user.findUnique({
    where: { email },
    include: { role: true, status: true }
  });
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    passwordHash: u.passwordHash ?? "",
    emailVerified: u.emailVerified,
    roleCode: u.role.code,
    statusCode: u.status.code
  };
}

/**
 * Lookup by email, used by self-registration dup-check + password-reset /
 * resend-verification flows. Returns the minimal projection — `id`,
 * `email`, `name`, `emailVerified`.
 */
export async function findUserByEmail(email: string): Promise<{
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
} | null> {
  const u = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, emailVerified: true }
  });
  return u ?? null;
}

/**
 * Lookup a user by reset-token hash. Returns null if not found or if the
 * expiry has passed.
 */
export async function findUserByResetTokenHash(tokenHash: string): Promise<{
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
} | null> {
  const u = await prisma.user.findFirst({
    where: { resetToken: tokenHash },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      resetTokenExpiry: true
    }
  });
  if (!u || !u.resetTokenExpiry || u.resetTokenExpiry < new Date()) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    emailVerified: u.emailVerified
  };
}

export type CreateSelfRegisteredUserInput = {
  email: string;
  passwordHash: string;
  name: string;
  organisationName?: string | null;
  /** Hashed verification token (the raw form goes into the verification link). */
  verificationTokenHash: string;
  verificationTokenExpiry: Date;
};

/**
 * Create a self-registered user. Looks up the `provider` role and
 * `invited` status references internally and applies them. Returns the new
 * user's minimal envelope. Throws if the reference data isn't seeded.
 *
 * The caller (register route) handles the dup-email check separately so it
 * can return a precise 409.
 */
export async function createSelfRegisteredUser(
  input: CreateSelfRegisteredUserInput
): Promise<{ id: string; email: string; name: string }> {
  const [providerRole, invitedStatus] = await Promise.all([
    prisma.userRoleType.findUnique({ where: { code: "provider" } }),
    prisma.userStatusType.findUnique({ where: { code: "invited" } })
  ]);
  if (!providerRole || !invitedStatus) {
    throw new Error("Reference data not seeded (run npm run db:seed).");
  }
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      organisationName: input.organisationName ?? null,
      passwordHash: input.passwordHash,
      roleId: providerRole.id,
      statusId: invitedStatus.id,
      emailVerified: false,
      verificationToken: input.verificationTokenHash,
      verificationTokenExpiry: input.verificationTokenExpiry,
      onboardingComplete: false
    }
  });
  return { id: user.id, email: user.email, name: user.name };
}

/**
 * Persist a fresh verification token on a user (rotating any previous one).
 */
export async function setUserVerificationToken(
  userId: string,
  hashedToken: string,
  expiry: Date
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationToken: hashedToken,
      verificationTokenExpiry: expiry
    }
  });
}

/**
 * Persist a fresh reset token on a user (rotating any previous one).
 */
export async function setUserResetToken(
  userId: string,
  hashedToken: string,
  expiry: Date
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      resetToken: hashedToken,
      resetTokenExpiry: expiry
    }
  });
}

/**
 * Complete a password reset atomically:
 *
 *   - set new passwordHash
 *   - clear both verification + reset tokens
 *   - mark emailVerified = true (the reset email proved address ownership)
 *   - optionally promote status from invited → active
 *   - write an audit row
 *
 * The status promotion is opt-in because the caller knows whether the user
 * was previously verified.
 */
export async function applyPasswordReset(
  userId: string,
  newPasswordHash: string,
  opts: { promoteToActive?: boolean } = {}
): Promise<void> {
  let activeStatusId: string | undefined;
  if (opts.promoteToActive) {
    const activeStatus = await prisma.userStatusType.findUnique({
      where: { code: "active" }
    });
    activeStatusId = activeStatus?.id;
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      resetToken: null,
      resetTokenExpiry: null,
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
      ...(activeStatusId ? { statusId: activeStatusId } : {})
    }
  });
  await writeAudit({
    actorUserId: userId,
    entityType: "user",
    entityId: userId,
    action: "user.password_reset"
  });
}
