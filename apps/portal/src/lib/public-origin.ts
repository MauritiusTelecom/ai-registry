import { getConfig } from "@airegistry/sdk";

/**
 * Returns the public absolute origin (scheme + host, no trailing slash)
 * for transactional emails and other off-site links.
 *
 * Resolution order:
 *   1. `https://{PORTAL_DOMAIN}` from deployment config (trusted default)
 *   2. X-Forwarded-* only when TRUST_FORWARDED_HEADERS=true (behind nginx/F5)
 *   3. Request URL origin (local dev / curl)
 */
export function getPublicOrigin(req: Request): string {
  try {
    const cfg = getConfig();
    if (cfg.portalDomain) {
      return `https://${cfg.portalDomain}`.replace(/\/+$/, "");
    }
  } catch {
    // config not loaded — fall through
  }

  const trustForwarded =
    process.env.TRUST_FORWARDED_HEADERS === "true" ||
    process.env.TRUST_FORWARDED_HEADERS === "1";

  if (trustForwarded) {
    const headers = req.headers;
    const proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const host =
      headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
      headers.get("host")?.split(",")[0]?.trim();
    if (proto && host && /^https?$/i.test(proto)) {
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  }

  return new URL(req.url).origin;
}
