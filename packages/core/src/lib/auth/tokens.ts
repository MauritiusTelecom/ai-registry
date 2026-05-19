/**
 * One-shot tokens for email verification and password reset.
 *
 * The token surfaced to the user is the raw URL-safe value; the database
 * stores its SHA-256 hash so a leaked DB row does not leak a usable link.
 * Tokens have explicit expiry timestamps (24h for verification, 1h for reset).
 */

import { createHash, randomBytes } from "node:crypto";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export function generateRawToken(byteLength: number = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function verificationExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + VERIFY_TTL_MS);
}

export function resetExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + RESET_TTL_MS);
}

/** Constant-time string compare (used by email-token lookup). */
export function constantTimeEquals(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
