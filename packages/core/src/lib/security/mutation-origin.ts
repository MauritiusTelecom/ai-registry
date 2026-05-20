/**
 * Origin / Referer checks for state-changing HTTP methods (CSRF mitigation).
 * Edge-safe — no Node-only imports.
 */

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isMutationMethod(method: string): boolean {
  return MUTATION_METHODS.has(method.toUpperCase());
}

function parseExtraOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Allowed request Origin values for browser-initiated mutations. */
export function buildAllowedMutationOrigins(): Set<string> {
  const origins = new Set<string>();
  const portal = process.env.PORTAL_DOMAIN?.trim();
  if (portal) {
    origins.add(`https://${portal}`);
    origins.add(`http://${portal}`);
  }
  for (const extra of parseExtraOrigins()) {
    origins.add(extra);
  }
  if (process.env.NODE_ENV !== "production") {
    for (const host of [
      "localhost:3002",
      "127.0.0.1:3002",
      "localhost:3000",
      "127.0.0.1:3000"
    ]) {
      origins.add(`http://${host}`);
      origins.add(`https://${host}`);
    }
  }
  return origins;
}

export type MutationOriginResult =
  | { allowed: true }
  | { allowed: false; reason: "disallowed-origin" | "missing-origin" };

/**
 * Validates Origin (preferred) or Referer for POST/PUT/PATCH/DELETE.
 * In production, mutations without a matching Origin/Referer are rejected.
 */
export function checkMutationOrigin(headers: Headers): MutationOriginResult {
  const requireOrigin =
    process.env.REQUIRE_MUTATION_ORIGIN === "true" ||
    process.env.REQUIRE_MUTATION_ORIGIN === "1" ||
    (process.env.REQUIRE_MUTATION_ORIGIN !== "false" &&
      process.env.NODE_ENV === "production");

  if (!requireOrigin) {
    return { allowed: true };
  }

  const allowed = buildAllowedMutationOrigins();
  const origin = headers.get("origin")?.trim();
  if (origin) {
    return allowed.has(origin)
      ? { allowed: true }
      : { allowed: false, reason: "disallowed-origin" };
  }

  const referer = headers.get("referer")?.trim();
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      return allowed.has(refOrigin)
        ? { allowed: true }
        : { allowed: false, reason: "disallowed-origin" };
    } catch {
      return { allowed: false, reason: "disallowed-origin" };
    }
  }

  return { allowed: false, reason: "missing-origin" };
}

/** Constant-time string compare (Edge-safe). */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export const CSRF_COOKIE_NAME =
  (typeof process !== "undefined" && process.env.CSRF_COOKIE_NAME?.trim()) ||
  "airegistry_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";
