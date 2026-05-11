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
 */

import { notFound, redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth/current-user";
import type { PortalRole } from "./nav-config";

/**
 * Resolve the portal a user should land on after sign-in / registration based
 * on their primary role code. The mapping is deliberately one-way (single
 * primary role → single portal) so the post-login redirect is predictable.
 *
 * Users with multiple roles still see all the portals they can reach via the
 * user-menu's role-switcher inside the portal - but on first sign-in we route
 * them to the portal that matches their primary role.
 */
export function portalForRole(roleCode: string | null | undefined): string {
  switch (roleCode) {
    case "admin":
      return "/admin";
    case "provider":
      return "/provider";
    case "reviewer":
    case "verifier":
      return "/verifier";
    case "sovereign":
      return "/sovereign";
    default:
      // auditor, viewer, or any unknown role - fall back to the generic
      // /portal landing which shows the user's profile envelope and links
      // them onward.
      return "/portal";
  }
}

// Path-prefix helpers re-exported from `./path` so existing callers keep
// working. The pure-string helpers live in `./path` because client
// components (e.g. ChromeSwitch) need them without dragging the
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
  return user;
}
