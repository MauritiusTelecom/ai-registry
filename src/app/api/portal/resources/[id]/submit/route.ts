import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { authoringGateForbiddenResponse } from "@/lib/portal/authoring-gate-response";
import { writeAudit } from "@/lib/audit/write-audit";
import { getConfig } from "@/lib/config";
import { emailTemplates } from "@/lib/email";
import { uniqueValidEmails } from "@/lib/email/recipients";
import { sendTransactionalEmailAll } from "@/lib/email/transactional-send";

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
    prisma.lifecycleStatus.findUnique({ where: { code: "submitted" } }),
    prisma.reviewStatusType.findUnique({ where: { code: "open" } }),
    prisma.reviewType.findUnique({ where: { code: "sovereignty_review" } })
  ]);
  if (!submitted || !openReview || !sovereigntyReviewType) {
    return NextResponse.json({ error: "Reference data not seeded." }, { status: 503 });
  }

  const resource = await prisma.resource.findFirst({
    where: { id, providerId },
    include: {
      lifecycleStatus: { select: { code: true } },
      provider: { select: { contactEmail: true, legalContactEmail: true } }
    }
  });
  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const code = resource.lifecycleStatus.code;
  if (code !== "draft" && code !== "needs_update") {
    return NextResponse.json(
      { error: "Only draft or needs_update resources can be submitted" },
      { status: 409 }
    );
  }

  const review = await prisma.$transaction(async (tx) => {
    const r = await tx.resource.update({
      where: { id },
      data: {
        lifecycleStatusId: submitted.id,
        submittedAt: new Date(),
        lastProviderUpdateAt: new Date()
      }
    });

    const rev = await tx.review.create({
      data: {
        resourceId: id,
        reviewTypeId: sovereigntyReviewType.id,
        statusId: openReview.id
      }
    });

    return { resource: r, review: rev };
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "resource",
    entityId: id,
    action: "resource.submitted_for_review",
    newValue: { reviewId: review.review.id, lifecycle: "submitted" }
  });

  const cfg = getConfig();
  const origin = new URL(req.url).origin;
  const recipients = uniqueValidEmails([
    user.email,
    resource.provider.contactEmail,
    resource.provider.legalContactEmail
  ]);
  let emailNotified = false;
  if (notifyByEmail && recipients.length > 0) {
    const tmpl = emailTemplates.resourceSubmittedForReview({
      registryName: cfg.registryName,
      resourceTitle: resource.title,
      reviewId: review.review.id,
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
    resourceId: id,
    reviewId: review.review.id,
    lifecycle: "submitted",
    emailNotified
  });
}
