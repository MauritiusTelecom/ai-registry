import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionCookieAttributes } from "@/lib/auth/session";

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Idempotent — calling without an active session
 * still returns 200.
 */
export async function POST() {
  const attrs = sessionCookieAttributes();
  const jar = await cookies();
  jar.set(attrs.name, "", {
    httpOnly: attrs.httpOnly,
    secure: attrs.secure,
    sameSite: attrs.sameSite,
    path: attrs.path,
    maxAge: 0
  });
  return NextResponse.json({ ok: true });
}
