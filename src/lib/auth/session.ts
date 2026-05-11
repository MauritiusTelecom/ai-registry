/**
 * Session tokens.
 *
 * The session cookie carries an HMAC-signed JSON payload. We avoid pulling in
 * a JWT library because the only consumer is this app - there is no need for
 * a third-party-readable token format. Compact, opaque-to-clients, signed.
 *
 *   Cookie value: <payloadBase64Url>.<hmacBase64Url>
 *
 * Payload fields:
 *   - userId  - UUID of the User row
 *   - iat     - issued-at (unix seconds)
 *   - exp     - expires-at (unix seconds)
 *
 * The cookie is HTTP-only, SameSite=Lax, Path=/, Secure when NODE_ENV=production.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { getConfig } from "@/lib/config";

export type SessionPayload = {
  userId: string;
  iat: number;
  exp: number;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("base64url");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function sign(payloadB64: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(payloadB64).digest();
  return b64url(mac);
}

/** Issue a new session token for the given user id. */
export function issueSessionToken(userId: string, now: Date = new Date()): string {
  const cfg = getConfig();
  const iat = Math.floor(now.getTime() / 1000);
  const exp = iat + cfg.auth.sessionTtlSeconds;
  const payload: SessionPayload = { userId, iat, exp };
  const payloadB64 = b64url(enc.encode(JSON.stringify(payload)));
  const sig = sign(payloadB64, cfg.auth.secret);
  return `${payloadB64}.${sig}`;
}

/** Verify a session token; returns the payload if valid, otherwise null. */
export function verifySessionToken(token: string | undefined, now: Date = new Date()): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const cfg = getConfig();
  const expected = sign(payloadB64, cfg.auth.secret);

  let sigBuf: Buffer;
  let expectedBuf: Buffer;
  try {
    sigBuf = fromB64url(sig);
    expectedBuf = fromB64url(expected);
  } catch {
    return null;
  }
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(dec.decode(fromB64url(payloadB64))) as SessionPayload;
  } catch {
    return null;
  }
  if (
    typeof payload.userId !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  const nowSec = Math.floor(now.getTime() / 1000);
  if (payload.exp <= nowSec) return null;

  return payload;
}

/** Cookie attributes shared by /set/ and /clear/ helpers. */
export function sessionCookieAttributes() {
  const cfg = getConfig();
  const isProd = process.env.NODE_ENV === "production";
  return {
    name: cfg.auth.sessionCookieName,
    httpOnly: true as const,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/" as const,
    maxAge: cfg.auth.sessionTtlSeconds
  };
}
