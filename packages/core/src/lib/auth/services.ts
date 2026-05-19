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
