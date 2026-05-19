/**
 * Portal search executor primitives.
 *
 * Each function is a thin wrapper around a single prisma findMany used by
 * the command-palette executor in apps/portal/src/lib/portals/search.ts.
 * Callers compose the role-specific `where` clauses; the helpers handle
 * the include + orderBy + take shape.
 *
 * Exposed via @airegistry/sdk/server.
 */

import { prisma } from "../prisma";

const RESULTS_PER_GROUP_DEFAULT = 6;

export async function searchResourcesRows(
  where: Record<string, unknown>,
  take: number = RESULTS_PER_GROUP_DEFAULT
) {
  return prisma.resource.findMany({
    where: where as never,
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      slug: true,
      title: true,
      airId: true,
      lifecycleStatus: { select: { name: true, code: true } },
      provider: { select: { slug: true, displayName: true } }
    }
  });
}

export async function searchProvidersRows(
  where: Record<string, unknown>,
  take: number = RESULTS_PER_GROUP_DEFAULT
) {
  return prisma.provider.findMany({
    where: where as never,
    orderBy: { displayName: "asc" },
    take,
    select: {
      id: true,
      slug: true,
      displayName: true,
      legalName: true,
      status: { select: { name: true, code: true } }
    }
  });
}

export async function searchComplaintsRows(
  where: Record<string, unknown>,
  take: number = RESULTS_PER_GROUP_DEFAULT
) {
  return prisma.complaint.findMany({
    where: where as never,
    orderBy: [{ status: { sortOrder: "asc" } }, { createdAt: "desc" }],
    take,
    select: {
      id: true,
      description: true,
      submittedAt: true,
      complaintType: { select: { name: true } },
      severity: { select: { name: true } },
      status: { select: { name: true, code: true } },
      targetResource: { select: { title: true } },
      targetProvider: { select: { displayName: true } }
    }
  });
}

export async function searchReviewsRows(
  where: Record<string, unknown>,
  take: number = RESULTS_PER_GROUP_DEFAULT
) {
  return prisma.review.findMany({
    where: where as never,
    orderBy: [{ status: { sortOrder: "asc" } }, { createdAt: "desc" }],
    take,
    select: {
      id: true,
      decisionSummary: true,
      reviewType: { select: { name: true } },
      status: { select: { name: true, code: true } },
      resource: { select: { id: true, title: true, slug: true } }
    }
  });
}

export async function searchIncidentsRows(
  where: Record<string, unknown>,
  take: number = RESULTS_PER_GROUP_DEFAULT
) {
  return prisma.enforcementAction.findMany({
    where: where as never,
    orderBy: { performedAt: "desc" },
    take,
    select: {
      id: true,
      reason: true,
      publicNote: true,
      performedAt: true,
      actionType: { select: { name: true } },
      targetResource: { select: { title: true } },
      targetProvider: { select: { displayName: true } }
    }
  });
}

export async function searchUsersRows(
  where: Record<string, unknown>,
  take: number = RESULTS_PER_GROUP_DEFAULT
) {
  return prisma.user.findMany({
    where: where as never,
    orderBy: { name: "asc" },
    take,
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { name: true } },
      status: { select: { name: true } }
    }
  });
}
