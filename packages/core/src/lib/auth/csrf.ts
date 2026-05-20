/**
 * Double-submit CSRF cookie paired with the session cookie.
 *
 * - `airegistry_csrf` is readable by JS (not HttpOnly) so clients can mirror
 *   it in the `X-CSRF-Token` header on mutations.
 * - Middleware rejects authenticated mutations when the header does not
 *   match the cookie.
 */

import { timingSafeEqual } from "node:crypto";
import { generateRawToken } from "./tokens";

export const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME?.trim() || "airegistry_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

export type CsrfCookieDirective = {
  name: string;
  value: string;
  httpOnly: false;
  secure: boolean;
  sameSite: "strict" | "lax";
  path: "/";
  maxAge: number;
};

export function issueCsrfCookie(maxAgeSeconds: number): CsrfCookieDirective {
  const isProd = process.env.NODE_ENV === "production";
  return {
    name: CSRF_COOKIE_NAME,
    value: generateRawToken(24),
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    path: "/",
    maxAge: maxAgeSeconds
  };
}

export function clearCsrfCookie(): CsrfCookieDirective {
  const isProd = process.env.NODE_ENV === "production";
  return {
    name: CSRF_COOKIE_NAME,
    value: "",
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    path: "/",
    maxAge: 0
  };
}

/** Edge-safe constant-time compare for middleware. */
export function csrfTokensMatch(cookieValue: string, headerValue: string): boolean {
  if (typeof cookieValue !== "string" || typeof headerValue !== "string") return false;
  if (cookieValue.length === 0 || cookieValue.length !== headerValue.length) return false;
  const a = Buffer.from(cookieValue, "utf8");
  const b = Buffer.from(headerValue, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
