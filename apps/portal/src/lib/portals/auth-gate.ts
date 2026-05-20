/**
 * Server-side role gate for portal layouts.
 *
 * The Edge middleware already verified the cookie's HMAC + expiry; this
 * helper performs the canonical user lookup and role check inside the
 * portal layout's server component. It is the second of the two-layer
 * defence (middleware + page) called for in `shared/auth.md` §7.
 *
 *   - Returns the SessionUser when the user holds the required role.
 *   - Calls `redirect()` to /login when no session exists.
 *   - Calls `notFound()` when the session is valid but the user lacks the
 *     role (we prefer 404 over 403 here so the existence of role-specific
 *     portals isn't disclosed to unauthorised users).
 *   - Redirects to /login?verify=1 when the session user has not yet
 *     verified their email (admins exempt — see comment inside).
 */

import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@airegistry/sdk/server";
import type { SessionUser } from "@airegistry/sdk";
import type { PortalRole } from "./nav-config";

// portalForRole moved to @airegistry/core/auth/portal-for-role so the public
// LoginPage in @airegistry/public can reach it too. Re-exported here so the
// existing `@/lib/portals/auth-gate` importers (post-login redirects in
// /api/auth/*, the admin user-row "Open <portal>" button) keep working.
export { portalForRole } from "@airegistry/core/auth/portal-for-role";

// Path-prefix helpers re-exported from `./path` so existing callers keep
// working. The pure-string helpers live in `./path` because client
// client path helpers need them without dragging the
// server-only `current-user` import that lives in this file.
export { PORTAL_PATH_PREFIXES, isPortalPath } from "./path";

const ROLE_ALIASES: Record<PortalRole, string[]> = {
  admin: ["admin"],
  // Admin can act in any portal (it's the operator-superuser role).
  provider: ["provider", "admin"],
  verifier: ["verifier", "reviewer", "admin"],
  sovereign: ["sovereign", "admin"]
};

export async function requireRole(
  role: PortalRole,
  options: { redirectTo?: string } = {}
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = options.redirectTo ?? "/portal";
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }
  const allowed = ROLE_ALIASES[role];
  if (!user.roles.some((r) => allowed.includes(r))) {
    notFound();
  }
  // Defence-in-depth: even if a session somehow exists for an unverified
  // user (the /api/auth/login route now blocks this, but other code paths
  // may exist in future), the portal stays closed until the email is
  // verified. Admins are exempt so an operator can recover broken accounts.
  if (!user.emailVerified && !user.roles.includes("admin")) {
    redirect("/login?verify=1");
  }
  return user;
}
