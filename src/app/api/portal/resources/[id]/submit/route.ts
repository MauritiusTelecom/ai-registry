import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { writeAudit } from "@/lib/audit/write-audit";

/**
 * POST /api/portal/resources/:id/submit — draft|needs_update → submitted + open review.
 */

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const providerId = await ensureUserProviderLinked(user.id);

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
    include: { lifecycleStatus: { select: { code: true } } }
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

  return NextResponse.json({
    ok: true,
    resourceId: id,
    reviewId: review.review.id,
    lifecycle: "submitted"
  });
}
