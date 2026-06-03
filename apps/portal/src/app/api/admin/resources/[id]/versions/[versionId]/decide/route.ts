import { NextResponse } from "next/server";
import {
  getCurrentUser,
  loadAdminResourceForTransition,
  approveDraft,
  rejectDraft,
  VersioningError,
  emailTemplates,
  uniqueValidEmails,
  sendTransactionalEmailAll
} from "@airegistry/sdk/server";
import { assertCanReview, SeparationOfDutiesError } from "@airegistry/sdk";
import { getConfig } from "@airegistry/sdk";
import { getPublicOrigin } from "@/lib/public-origin";

/**
 * POST /api/admin/resources/:id/versions/:versionId/decide
 *
 * Body: { action: "approve" | "reject", note?: string, notifyByEmail?: boolean }
 *
 * Lightweight diff-based approval of a provider's edit to a LIVE resource.
 * - approve: the draft's scalar fields overwrite the live listing and become
 *   the current published version (handled in approveDraft).
 * - reject: the draft flips to "rejected"; the live listing is untouched and
 *   the provider can edit and resubmit.
 *
 * The full §11 sovereignty checklist still lives at /admin/reviews/[id]/decide
 * for first-time listings; this path is the per-edit re-approval.
 */

type Body = {
  action?: unknown;
  note?: unknown;
  notifyByEmail?: unknown;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; versionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin") && !user.roles.includes("reviewer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, versionId } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action =
    typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be approve | reject" },
      { status: 400 }
    );
  }
  const note =
    typeof body.note === "string" && body.note.trim().length > 0
      ? body.note.trim()
      : undefined;

  const resource = await loadAdminResourceForTransition(id);
  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  // Separation of duties: a reviewer cannot decide on their own provider's edit.
  try {
    assertCanReview(user, { providerId: resource.provider.id });
  } catch (err) {
    if (err instanceof SeparationOfDutiesError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  try {
    const decided =
      action === "approve"
        ? await approveDraft({ resourceId: id, versionId, user, decisionNote: note })
        : await rejectDraft({ resourceId: id, versionId, user, decisionNote: note });

    // Notify the provider's contacts of the decision (best-effort).
    let emailNotified = false;
    if (body.notifyByEmail !== false) {
      const recipients = uniqueValidEmails([
        resource.provider.contactEmail,
        resource.provider.legalContactEmail
      ]);
      if (recipients.length > 0) {
        const cfg = getConfig();
        const origin = getPublicOrigin(req);
        const tmpl = emailTemplates.resourceLifecycleChanged({
          registryName: cfg.registryName,
          providerDisplayName: resource.provider.displayName,
          resourceTitle: resource.title,
          actionLabel: action === "approve" ? "Update approved" : "Update rejected",
          newStatusLabel:
            action === "approve" ? "Live (update published)" : "Changes requested",
          reason: note ?? "(no note)",
          portalResourcesUrl: `${origin}/provider/resources`
        });
        sendTransactionalEmailAll("resource_version_decided", recipients, (to: string) => ({
          to,
          subject: tmpl.subject,
          text: tmpl.text
        }));
        emailNotified = true;
      }
    }

    return NextResponse.json({
      ok: true,
      resourceId: id,
      versionId: decided.id,
      action,
      emailNotified
    });
  } catch (err) {
    if (err instanceof VersioningError) {
      const status =
        err.code === "forbidden"
          ? 403
          : err.code === "not_found"
            ? 404
            : err.code === "seed_missing"
              ? 503
              : 409;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
