/**
 * Resolve the portal a user should land on after sign-in / registration based
 * on their primary role code. The mapping is deliberately one-way (single
 * primary role -> single portal) so the post-login redirect is predictable.
 *
 * Users with multiple roles still see all the portals they can reach via the
 * user-menu's role-switcher inside the portal - but on first sign-in we route
 * them to the portal that matches their primary role.
 *
 * Lives in @airegistry/core/auth (instead of apps/portal's lib/portals/) so
 * both the role-portal auth-gate AND the public LoginPage (now in
 * @airegistry/public) can reach it without a dependency cycle.
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
