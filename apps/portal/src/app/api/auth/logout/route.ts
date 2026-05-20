import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, clearCsrfCookieDirective } from "@airegistry/sdk/server";

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Idempotent - calling without an active session
 * still returns 200.
 */
export async function POST() {
  const jar = await cookies();
  const cleared = clearSessionCookie();
  jar.set(cleared.name, cleared.value, {
    httpOnly: cleared.httpOnly,
    secure: cleared.secure,
    sameSite: cleared.sameSite,
    path: cleared.path,
    maxAge: cleared.maxAge
  });
  const csrf = clearCsrfCookieDirective();
  jar.set(csrf.name, csrf.value, {
    httpOnly: csrf.httpOnly,
    secure: csrf.secure,
    sameSite: csrf.sameSite,
    path: csrf.path,
    maxAge: csrf.maxAge
  });
  return NextResponse.json({ ok: true });
}
