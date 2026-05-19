import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie } from "@airegistry/sdk/server";

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Idempotent - calling without an active session
 * still returns 200.
 */
export async function POST() {
  const { name, value, ...cookieAttrs } = clearSessionCookie();
  const jar = await cookies();
  jar.set(name, value, cookieAttrs);
  return NextResponse.json({ ok: true });
}
