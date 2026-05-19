import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";

/**
 * GET /api/auth/me
 *
 * Returns the current session's user envelope, or `{ user: null }` when no
 * valid session exists. Never throws - callers can safely render based on
 * `user === null`.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      onboardingComplete: user.onboardingComplete,
      canAuthorResources: user.canAuthorResources,
      roles: user.roles,
      role: user.role,
      status: user.status,
      provider: user.provider
    }
  });
}
