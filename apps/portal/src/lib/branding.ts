import { getConfig } from "@airegistry/sdk";
import { loadBrandingSingleton } from "@airegistry/sdk/server";

export type Branding = {
  registryName: string;
  logoUrl: string | null;
  copyrightLine: string;
  buildLine: string;
  heroEyebrowText: string;
  heroEyebrowIconUrl: string | null;
};

const DEFAULT_COPYRIGHT_LINE = "© 2026 Mauritius AI Registry · airegistry.mu";
const DEFAULT_BUILD_LINE = "BUILD 2026.05.07-r3 · TZ:GMT+4";

let cache: { value: Branding; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

/** Clear the in-memory branding cache; call from admin write paths. */
export function invalidateBrandingCache() {
  cache = null;
}

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
