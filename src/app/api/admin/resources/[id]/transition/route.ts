import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  assertCanReview,
  SeparationOfDutiesError
} from "@/lib/auth/separation-of-duties";
import { writeAudit } from "@/lib/audit/write-audit";
import { getConfig } from "@/lib/config";

/**
 * POST /api/admin/resources/:id/transition
 *
 * Body: { action: "approve" | "reject" | "suspend" | "restore" | "deprecate" |
 *                 "remove",
 *         reason: string }
 *
 * Lifecycle codes follow `ai-registry/specs.md` §8.1. The §11 sovereignty
 * checklist remains required for the proper review pathway at
 * `/admin/reviews/[id]/decide`; this endpoint is the **direct admin
 * shortcut** used from the resources grid (e.g. for resources already
 * approved by a reviewer or for emergency suspend/restore/remove).
 *
 * See `ai-registry-specs/shared/admin-crud.md` §5.1.
 */

type Body = {
  action?: unknown;
  reason?: unknown;
};

type Action =
  | "approve"
  | "reject"
  | "suspend"
  | "restore"
  | "deprecate"
  | "remove";

const VALID: Action[] = [
  "approve",
  "reject",
  "suspend",
  "restore",
  "deprecate",
  "remove"
];

const ALLOWED_FROM: Record<Action, Set<string>> = {
  approve: new Set(["draft", "submitted", "in_review", "needs_update"]),
  reject: new Set(["submitted", "in_review", "listed", "needs_update"]),
  suspend: new Set(["listed"]),
  restore: new Set(["suspended", "deprecated"]),
  deprecate: new Set(["listed"]),
  remove: new Set(["listed", "suspended", "deprecated", "needs_update", "draft", "submitted", "in_review"])
};

const TARGET_LIFECYCLE: Record<Action, string> = {
  approve: "listed",
  reject: "needs_update",
  suspend: "suspended",
  restore: "listed",
  deprecate: "deprecated",
  remove: "removed"
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action =
    typeof body.action === "string" ? (body.action.trim().toLowerCase() as Action) : ("" as Action);
  if (!VALID.includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID.join(", ")}` },
      { status: 400 }
    );
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 4) {
    return NextResponse.json({ error: "reason is required (min 4 chars)" }, { status: 400 });
  }

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      lifecycleStatus: { select: { code: true } },
      provider: { select: { id: true, slug: true } },
      resourceType: { select: { code: true } }
    }
  });
  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  try {
    assertCanReview(actor, { providerId: resource.provider.id });
  } catch (e) {
    if (e instanceof SeparationOfDutiesError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

  const fromCode = resource.lifecycleStatus.code;
  if (!ALLOWED_FROM[action].has(fromCode)) {
    return NextResponse.json(
      {
        error: `Cannot ${action} a resource currently in lifecycle "${fromCode}".`
      },
      { status: 409 }
    );
  }

  const toCode = TARGET_LIFECYCLE[action];

  const [toLifecycle, signalKind, passed, withdrawn, failed] = await Promise.all([
    prisma.lifecycleStatus.findUnique({ where: { code: toCode } }),
    prisma.trustSignalType.findUnique({ where: { code: "sovereignty_review" } }),
    prisma.trustSignalStatusType.findUnique({ where: { code: "passed" } }),
    prisma.trustSignalStatusType.findUnique({ where: { code: "withdrawn" } }),
    prisma.trustSignalStatusType.findUnique({ where: { code: "failed" } })
  ]);
  if (!toLifecycle || !signalKind || !passed || !withdrawn || !failed) {
    return NextResponse.json({ error: "Reference data not seeded." }, { status: 503 });
  }

  // Build the resource update payload per action.
  const cfg = getConfig();
  const update: Record<string, unknown> = { lifecycleStatusId: toLifecycle.id };

  if (action === "approve") {
    if (!resource.airId) {
      update.airId = `air://${cfg.identityDomain}/${resource.resourceType.code}/${resource.provider.slug}/${resource.slug}`;
    }
    update.publicVisibility = true;
    update.listedAt = new Date();
    update.lastReviewedAt = new Date();
  }
  if (action === "restore") {
    update.publicVisibility = true;
  }
  if (action === "suspend" || action === "remove" || action === "deprecate") {
    if (action === "remove") update.publicVisibility = false;
    // `deprecate` keeps the row publicly visible (carries its own lifecycle
    // status code); the audit row records the timestamp via createdAt.
  }

  // TrustSignal mapping: approve → passed, reject/suspend/remove → failed,
  // restore → passed, deprecate → withdrawn.
  const trustStatusId =
    action === "approve" || action === "restore"
      ? passed.id
      : action === "deprecate"
        ? withdrawn.id
        : failed.id;

  await prisma.$transaction(async (tx) => {
    await tx.resource.update({ where: { id }, data: update });

    await tx.trustSignal.create({
      data: {
        kindId: signalKind.id,
        targetResourceId: id,
        targetProviderId: resource.provider.id,
        statusId: trustStatusId,
        decisionSummary: reason,
        publicNote: action === "approve" || action === "restore" ? reason : null,
        internalNote: action === "approve" ? null : reason,
        decidedById: actor.id,
        decidedAt: new Date()
      }
    });
  });

  await writeAudit({
    actorUserId: actor.id,
    entityType: "resource",
    entityId: id,
    action: `resource.${action}`,
    previousValue: { lifecycle: fromCode },
    newValue: { lifecycle: toCode, reason }
  });

  return NextResponse.json({
    ok: true,
    resourceId: id,
    fromLifecycle: fromCode,
    toLifecycle: toCode
  });
}
