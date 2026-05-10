/**
 * Shared validators (Phase 5 / T053).
 *
 * Hardened format checks for AIR-IDs, slugs, and outbound URLs. Routes and the
 * MCP adapter import from here so the same rules apply on every surface.
 *
 * Design notes:
 *  - The patterns are deliberately narrower than RFC 3986 — registry inputs
 *    are operator-curated and we prefer to reject ambiguous values early.
 *  - Tests for these helpers live alongside the smoke script under `scripts/`.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Strict registry slug: lowercase alpha-num plus single hyphen separators. */
export function isSlug(value: string, opts?: { min?: number; max?: number }): boolean {
  const min = opts?.min ?? 2;
  const max = opts?.max ?? 120;
  if (typeof value !== "string") return false;
  if (value.length < min || value.length > max) return false;
  return SLUG_RE.test(value);
}

/**
 * Loose http(s) URL validator. Returns false for non-strings, anything other
 * than http/https schemes, and URLs whose host is missing.
 */
export function isHttpUrl(value: string): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!u.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Stricter URL validator suitable for registry-public fields (`accessUrl`,
 * `documentationUrl`, etc.). Beyond `isHttpUrl`, in production it rejects
 * loopback / private hosts to prevent SSRF-style references.
 */
export function isPublicHttpUrl(value: string, opts?: { allowLocalhost?: boolean }): boolean {
  if (!isHttpUrl(value)) return false;
  const allowLocalhost = opts?.allowLocalhost ?? process.env.NODE_ENV !== "production";
  const u = new URL(value);
  const host = u.hostname.toLowerCase();
  if (allowLocalhost) return true;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
  if (host.endsWith(".local")) return false;
  if (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return false;
  }
  return true;
}

/**
 * AIR-ID parser. Returns `null` if `value` does not match
 * `air://<domain>/<type>/<provider>/<slug>`. The domain, provider, and slug
 * components are normalised to lowercase to make comparisons stable.
 */
export type AirIdParts = {
  domain: string;
  type: string;
  provider: string;
  slug: string;
};

const AIR_RE = /^air:\/\/([^/]+)\/([^/]+)\/([^/]+)\/([^/?#]+)$/;

const ALLOWED_TYPES = new Set(["model", "agent", "tool", "skill"]);

export function parseAirId(value: string): AirIdParts | null {
  if (typeof value !== "string") return null;
  const m = AIR_RE.exec(value.trim());
  if (!m) return null;
  const [, domain, type, provider, slug] = m;
  if (!ALLOWED_TYPES.has(type)) return null;
  if (!isSlug(provider, { min: 1 })) return null;
  if (!isSlug(slug, { min: 1 })) return null;
  return {
    domain: domain.toLowerCase(),
    type,
    provider: provider.toLowerCase(),
    slug: slug.toLowerCase()
  };
}

export function isAirId(value: string): boolean {
  return parseAirId(value) !== null;
}
