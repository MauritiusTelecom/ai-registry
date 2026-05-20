import { getConfig } from "./config";
import { loadBrandingSingleton } from "./services/portal";

export type Branding = {
  registryName: string;
  logoUrl: string | null;
  copyrightLine: string;
  buildLine: string;
  heroEyebrowText: string;
  heroEyebrowIconUrl: string | null;
};

const DEFAULT_COPYRIGHT_LINE = "(c) 2026 Mauritius AI Registry - airegistry.mu";
const DEFAULT_BUILD_LINE = "BUILD 2026.05.07-r3 - TZ:GMT+4";

let cache: { value: Branding; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

/** Clear the in-memory branding cache; call from admin write paths. */
export function invalidateBrandingCache() {
  cache = null;
}

/**
 * Branding composition: deployment .env config merged with DB-backed overrides
 * set via /admin/branding, with built-in fallback strings. Used by both the
 * public site (SiteShell) and the role-workspace chrome (PortalLayoutChrome,
 * ProviderPortalChrome, etc.), so it lives in @airegistry/core where every
 * portal can reach it via `@airegistry/core/branding`.
 */
export async function getBranding(): Promise<Branding> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  const cfg = getConfig();
  const row = await loadBrandingSingleton();

  const value: Branding = {
    registryName: row?.registryName?.trim() || cfg.registryName,
    logoUrl: row?.logoUrl?.trim() || null,
    copyrightLine: row?.copyrightLine?.trim() || DEFAULT_COPYRIGHT_LINE,
    buildLine: row?.buildLine?.trim() || DEFAULT_BUILD_LINE,
    heroEyebrowText: row?.heroEyebrowText?.trim() || cfg.portalDomain,
    heroEyebrowIconUrl: row?.heroEyebrowIconUrl?.trim() || null
  };

  cache = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}
