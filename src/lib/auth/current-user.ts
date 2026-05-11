/**
 * Server-side session resolver.
 *
 * Reads the session cookie, verifies its HMAC, and resolves the user record
 * (with role + status + provider linkage) from the database. Returns `null`
 * when no valid session exists. Throws only on database errors.
 *
 * Use this in server components, route handlers, and middleware-adjacent
 * code. Do NOT import from a `"use client"` file.
 */

import { cookies } from "next/headers";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "./session";
import { computeCanAuthorResources } from "./provider-profile-gate";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  onboardingComplete: boolean;
  /** True when the provider may create drafts and submit resources (T030–T032). */
  canAuthorResources: boolean;
  role: { code: string; name: string };
  status: { code: string; name: string };
  provider: { id: string; slug: string; displayName: string } | null;
  /** Effective role codes - primary role plus extra UserRoleAssignment codes. */
  roles: string[];
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cfg = getConfig();
  const jar = await cookies();
  const token = jar.get(cfg.auth.sessionCookieName)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      role: true,
      status: true,
      provider: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          contactEmail: true,
          homeJurisdictionId: true,
          typeId: true
        }
      },
      roleAssignments: { include: { role: true } }
    }
  });

  if (!user) return null;
  if (user.status.code === "deactivated" || user.status.code === "suspended") {
    return null;
  }

  const extraRoles = (user.roleAssignments ?? []).map((ra) => ra.role.code);
  const roles = Array.from(new Set([user.role.code, ...extraRoles]));

  const canAuthorResources = computeCanAuthorResources(
    {
      emailVerified: user.emailVerified,
      onboardingComplete: user.onboardingComplete,
      roleCode: user.role.code
    },
    user.provider
  );

  const providerSummary = user.provider
    ? { id: user.provider.id, slug: user.provider.slug, displayName: user.provider.displayName }
    : null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    onboardingComplete: user.onboardingComplete,
    canAuthorResources,
    role: { code: user.role.code, name: user.role.name },
    status: { code: user.status.code, name: user.status.name },
    provider: providerSummary,
    roles
  };
}

/**
 * Convenience: throw 401-shaped errors when called from a route handler that
 * requires authentication. The thrown Response can be returned directly:
 *
 *   const user = await requireUser();
 *   if (user instanceof Response) return user;
 */
export async function requireUser(): Promise<SessionUser | Response> {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }
  return user;
}
