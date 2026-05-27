import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getReferenceRow,
  loadAdminResourceForTransition,
  applyAdminResourceTransition,
  emailTemplates,
  uniqueValidEmails,
  sendTransactionalEmailAll
} from "@airegistry/sdk/server";
import {
  assertCanReview,
  SeparationOfDutiesError
} from "@airegistry/sdk";
import { getConfig } from "@airegistry/sdk";
import { getPublicOrigin } from "@/lib/public-origin";

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
  notifyByEmail?: unknown;
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
  restore: new Set([
    "suspended",
    "deprecated",
    "removed",
    "needs_update",
    "draft",
    "submitted",
    "in_review"
  ]),
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

  const resource = await loadAdminResourceForTransition(id);
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
    getReferenceRow("lifecycleStatus", toCode),
    getReferenceRow("trustSignalType", "sovereignty_review"),
    getReferenceRow("trustSignalStatusType", "passed"),
    getReferenceRow("trustSignalStatusType", "withdrawn"),
    getReferenceRow("trustSignalStatusType", "failed")
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
    if (!resource.airId) {
      update.airId = `air://${cfg.identityDomain}/${resource.resourceType.code}/${resource.provider.slug}/${resource.slug}`;
    }
    update.publicVisibility = true;
    if (!resource.listedAt) update.listedAt = new Date();
    update.lastReviewedAt = new Date();
  }
  if (action === "suspend" || action === "remove" || action === "deprecate") {
    if (action === "remove") update.publicVisibility = false;
  }

  const trustStatusId =
    action === "approve" || action === "restore"
      ? passed.id
      : action === "deprecate"
        ? withdrawn.id
        : failed.id;

  await applyAdminResourceTransition(actor.id, {
    resourceId: id,
    resourceData: update,
    trustSignal: {
      kindId: signalKind.id,
      targetProviderId: resource.provider.id,
      statusId: trustStatusId,
      decisionSummary: reason,
      publicNote: action === "approve" || action === "restore" ? reason : null,
      internalNote: action === "approve" ? null : reason
    },
    audit: {
      action: `resource.${action}`,
      previousValue: { lifecycle: fromCode },
      newValue: { lifecycle: toCode, reason }
    }
  });

  // Notify the provider's contacts of the lifecycle transition.
  const notifyByEmail = body.notifyByEmail !== false;
  const origin = getPublicOrigin(req);
  const recipients = uniqueValidEmails([
    resource.provider.contactEmail,
    resource.provider.legalContactEmail
  ]);
  let emailNotified = false;
  if (notifyByEmail && recipients.length > 0) {
    const actionLabel: Record<Action, string> = {
      approve: "Approved",
      reject: "Rejected — needs update",
      suspend: "Suspended",
      restore: "Restored",
      deprecate: "Deprecated",
      remove: "Removed"
    };
    const publicCatalogUrl =
      toCode === "listed" || toCode === "deprecated"
        ? `${origin}/registry/${resource.slug}`
        : undefined;
    const tmpl = emailTemplates.resourceLifecycleChanged({
      registryName: cfg.registryName,
      providerDisplayName: resource.provider.displayName,
      resourceTitle: resource.title,
      actionLabel: actionLabel[action],
      newStatusLabel: toCode,
      reason,
      portalResourcesUrl: `${origin}/provider/resources`,
      publicCatalogUrl
    });
    sendTransactionalEmailAll("resource_lifecycle", recipients, (to) => ({
      to,
      subject: tmpl.subject,
      text: tmpl.text
    }));
    emailNotified = true;
  }

  return NextResponse.json({
    ok: true,
    resourceId: id,
    fromLifecycle: fromCode,
    toLifecycle: toCode,
    emailNotified
  });
}
