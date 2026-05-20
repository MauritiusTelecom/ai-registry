/**
 * Public-site navigation targets that depend on session + role.
 * Used by footer (and similar) client links so behaviour matches portal gates.
 *
 * Lives in @airegistry/public/lib because it serves the public site exclusively
 * (the footer + marketing chrome). Role-portal routing helpers stay in
 * `apps/portal/src/lib/portals/`.
 */

const PROVIDER_PORTAL_PATH = "/provider";

type RolesEnvelope = { roles: string[] };

/** Same allow-list as `requireRole("provider")` ROLE_ALIASES for portal entry. */
function canOpenProviderWorkspace(user: RolesEnvelope): boolean {
  return user.roles.includes("provider") || user.roles.includes("admin");
}

/**
 * Footer / marketing "Provider portal" entry:
 * - Session still loading -> `/provider` (server layout redirects anon to login with `next`).
 * - Signed out -> `/login?next=/provider` so post-login lands in the provider workspace.
 * - Provider or admin -> `/provider`.
 * - Other signed-in roles -> `/portal` (generic account landing; avoids a 404 from `/provider`).
 */
export function resolveProviderPortalPublicHref(
  user: RolesEnvelope | null,
  loading: boolean
): string {
  if (loading) return PROVIDER_PORTAL_PATH;
  if (!user) return `/login?next=${encodeURIComponent(PROVIDER_PORTAL_PATH)}`;
  if (canOpenProviderWorkspace(user)) return PROVIDER_PORTAL_PATH;
  return "/portal";
}
