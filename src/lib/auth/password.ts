/**
 * Password hashing using node:crypto's scrypt.
 *
 * We deliberately avoid bcrypt/argon2 to keep the dependency surface small;
 * scrypt is part of the Node standard library and is suitable for the
 * Phase 2 password posture (low-volume, server-side hashing).
 *
 * Stored format:
 *   `scrypt$N=16384,r=8,p=1$<saltBase64>$<keyBase64>`
 *
 * Forward-compat: the algorithm/params prefix lets us migrate to argon2 or
 * bump scrypt parameters later without invalidating existing hashes — the
 * verifier reads the prefix and dispatches.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

type ScryptOpts = { N: number; r: number; p: number };

function scryptAsync(
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  opts: ScryptOpts
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, opts, (err, derived) => {
      if (err) reject(err);
      else resolve(derived as Buffer);
    });
  });
}

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;
const PREFIX = `scrypt$N=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}`;

export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== "string" || plain.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const salt = randomBytes(SALT_LEN);
  const key = await scryptAsync(plain.normalize("NFKC"), salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P
  });
  return `${PREFIX}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (typeof plain !== "string" || typeof stored !== "string") return false;
  const parts = stored.split("$");
  // Expect: scrypt | N=...,r=...,p=... | salt | key
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const params = parts[1];
  const match = /^N=(\d+),r=(\d+),p=(\d+)$/.exec(params);
  if (!match) return false;
  const N = Number.parseInt(match[1], 10);
  const r = Number.parseInt(match[2], 10);
  const p = Number.parseInt(match[3], 10);
  if (!N || !r || !p) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[2], "base64");
    expected = Buffer.from(parts[3], "base64");
  } catch {
    return false;
  }

  const candidate = await scryptAsync(plain.normalize("NFKC"), salt, expected.length, {
    N,
    r,
    p
  });

  // Lengths must match before timingSafeEqual.
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
