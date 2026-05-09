import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

/**
 * GET /api/auth/me
 *
 * Returns the current session's user envelope, or `{ user: null }` when no
 * valid session exists. Never throws — callers can safely render based on
 * `user === null`.
 */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}
