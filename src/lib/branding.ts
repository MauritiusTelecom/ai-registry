import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";

export type Branding = {
  registryName: string;
  logoUrl: string | null;
  copyrightLine: string;
  buildLine: string;
};

const DEFAULT_COPYRIGHT_LINE = "© 2026 Mauritius AI Registry · airegistry.mu";
const DEFAULT_BUILD_LINE = "BUILD 2026.05.07-r3 · TZ:GMT+4";
const SINGLETON_ID = "default";

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
  let row: { registryName: string | null; logoUrl: string | null; copyrightLine: string | null; buildLine: string | null } | null = null;
  try {
    row = await prisma.siteBranding.findUnique({
      where: { id: SINGLETON_ID },
      select: { registryName: true, logoUrl: true, copyrightLine: true, buildLine: true }
    });
  } catch {
    // DB not reachable or table missing - fall back to env/defaults so the
    // public site keeps rendering instead of 500ing on a config issue.
    row = null;
  }

  const value: Branding = {
    registryName: row?.registryName?.trim() || cfg.registryName,
    logoUrl: row?.logoUrl?.trim() || null,
    copyrightLine: row?.copyrightLine?.trim() || DEFAULT_COPYRIGHT_LINE,
    buildLine: row?.buildLine?.trim() || DEFAULT_BUILD_LINE
  };

  cache = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}
