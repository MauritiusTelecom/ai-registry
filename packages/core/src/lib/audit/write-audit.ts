import { prisma } from "../prisma";

/**
 * Append-only governance audit row (AIR-SPEC §18). Call from mutating routes
 * after successful writes.
 */
export async function writeAudit(input: {
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      previousValue: input.previousValue === undefined ? undefined : (input.previousValue as object),
      newValue: input.newValue === undefined ? undefined : (input.newValue as object),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null
    }
  });
}

/**
 * Count audit rows for a given (entityType, entityId, action) within the last
 * `sinceMs` milliseconds. Used to debounce provider-initiated actions (e.g.
 * withdrawal requests) so repeated clicks don't spam the operator.
 */
export async function countRecentAudit(input: {
  entityType: string;
  entityId: string;
  action: string;
  sinceMs: number;
}): Promise<number> {
  return prisma.auditLog.count({
    where: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      createdAt: { gte: new Date(Date.now() - input.sinceMs) }
    }
  });
}
