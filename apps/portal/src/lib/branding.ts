/**
 * DEPRECATED location - this module moved to `@airegistry/core/branding`.
 *
 * Re-export shim kept so the `@/lib/branding` path alias in
 * `apps/portal/tsconfig.json` (and the 9 existing importers across role-portal
 * chrome, admin API routes, root layout, and the public site) keep resolving
 * during the deprecation window. Remove this file once those importers have
 * been migrated to `@airegistry/core/branding`.
 */
export {
  getBranding,
  invalidateBrandingCache,
  type Branding
} from "@airegistry/core/branding";
