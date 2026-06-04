import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getReferenceRow,
  submitMyResourceForReview,
  ensureResourceVerificationRows,
  emailTemplates,
  uniqueValidEmails,
  sendTransactionalEmailAll
} from "@airegistry/sdk/server";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { authoringGateForbiddenResponse } from "@/lib/portal/authoring-gate-response";
import { getConfig } from "@airegistry/sdk";
import { getPublicOrigin } from "@/lib/public-origin";

/**
 * POST /api/portal/resources/:id/submit - draft|needs_update → submitted + open review.
 */

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!user.canAuthorResources) return authoringGateForbiddenResponse();

  const { id } = await ctx.params;
  const providerId = await ensureUserProviderLinked(user.id);

  // Optional body: { notifyByEmail?: boolean }. Defaults to true so existing
  // clients (which sent an empty body) keep notifying.
  let notifyByEmail = true;
  try {
    const body = (await req.json()) as { notifyByEmail?: unknown };
    if (body && body.notifyByEmail === false) notifyByEmail = false;
  } catch {
    // No body / not JSON — keep the default.
  }

  const [submitted, openReview, sovereigntyReviewType] = await Promise.all([
    getReferenceRow("lifecycleStatus", "submitted"),
    getReferenceRow("reviewStatusType", "open"),
    getReferenceRow("reviewType", "sovereignty_review")
  ]);
  if (!submitted || !openReview || !sovereigntyReviewType) {
    return NextResponse.json({ error: "Reference data not seeded." }, { status: 503 });
  }

  const result = await submitMyResourceForReview(user.id, providerId, id, {
    submittedLifecycleId: submitted.id,
    openReviewStatusId: openReview.id,
    sovereigntyReviewTypeId: sovereigntyReviewType.id
  });

  // Materialise any applicable resource-level verification requirements so they
  // surface in the admin queue and gate public listing until verified.
  if (result.ok) {
    await ensureResourceVerificationRows(id).catch(() => {});
  }

  if (!result.ok) {
    if (result.code === "not_found") {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Only draft or needs_update resources can be submitted" },
      { status: 409 }
    );
  }

  const cfg = getConfig();
  const origin = getPublicOrigin(req);
  const recipients = uniqueValidEmails([
    user.email,
    result.providerContactEmail,
    result.providerLegalContactEmail
  ]);
  let emailNotified = false;
  if (notifyByEmail && recipients.length > 0) {
    const tmpl = emailTemplates.resourceSubmittedForReview({
      registryName: cfg.registryName,
      resourceTitle: result.resourceTitle,
      reviewId: result.reviewId,
      portalResourcesUrl: `${origin}/provider/resources`,
      portalReviewsUrl: `${origin}/provider/reviews`
    });
    sendTransactionalEmailAll("resource_submitted", recipients, (to) => ({
      to,
      subject: tmpl.subject,
      text: tmpl.text
    }));
    emailNotified = true;
  }

  return NextResponse.json({
    ok: true,
    resourceId: result.resourceId,
    reviewId: result.reviewId,
    lifecycle: "submitted",
    emailNotified
  });
}
