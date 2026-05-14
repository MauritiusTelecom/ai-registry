import { getConfig } from "@/lib/config";

/**
 * Returns the public absolute origin (scheme + host, no trailing slash)
 * for the current request, suitable for embedding in transactional emails
 * and other off-site links.
 *
 * Behind F5 + nginx the app listens on 127.0.0.1:3002, so `new URL(req.url)`
 * always yields `http://localhost:3002` - useless for outbound email links.
 *
 * Resolution order:
 *   1. X-Forwarded-Proto + X-Forwarded-Host headers (set by our nginx vhost)
 *   2. https://{PORTAL_DOMAIN} from src/lib/config.ts (env var)
 *   3. last-ditch fallback to the request's own origin (dev / curl tests)
 */
export function getPublicOrigin(req: Request): string {
  const headers = req.headers;
  const proto = headers.get("x-forwarded-proto");
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (proto && host) {
    return `${proto}://${host}`.replace(/\/+$/, "");
  }
  try {
    const cfg = getConfig();
    if (cfg.portalDomain) return `https://${cfg.portalDomain}`;
  } catch {
    // config not loaded (test harness, etc.) - fall through
  }
  return new URL(req.url).origin;
}
