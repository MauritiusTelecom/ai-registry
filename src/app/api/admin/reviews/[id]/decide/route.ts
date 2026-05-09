import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { assertCanReview, SeparationOfDutiesError } from "@/lib/auth/separation-of-duties";
import { writeAudit } from "@/lib/audit/write-audit";
import {
  SOVEREIGNTY_CHECKLIST_ITEMS,
  type ChecklistAnswerCode
} from "@/lib/governance/sovereignty-checklist";

type Decision = "approve" | "reject" | "request_changes";

type Body = {
  decision?: unknown;
  decisionSummary?: unknown;
  checklist?: unknown;
};

function isChecklistAnswer(v: unknown): v is ChecklistAnswerCode {
  return v === "yes" || v === "no" || v === "n_a";
}

/**
 * POST /api/admin/reviews/:id/decide
 *
 * Body: { decision, decisionSummary, checklist? }
 * For `approve`, all six §11 checklist answers are required; `approve` is
 * rejected if any answer is `no`.
 */

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin") && !user.roles.includes("reviewer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: reviewId } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const decision = body.decision as Decision;
  if (decision !== "approve" && decision !== "reject" && decision !== "request_changes") {
    return NextResponse.json({ error: "decision must be approve | reject | request_changes" }, { status: 400 });
  }
  if (typeof body.decisionSummary !== "string" || body.decisionSummary.trim().length < 4) {
    return NextResponse.json({ error: "decisionSummary is required" }, { status: 400 });
  }
  const summary = body.decisionSummary.trim();

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      status: true,
      resource: {
        include: {
          provider: true,
          lifecycleStatus: true,
          resourceType: true
        }
      }
    }
  });

  if (!review || !review.resourceId || !review.resource) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }
  if (review.status.code === "decided" || review.status.code === "withdrawn") {
    return NextResponse.json({ error: "Review already closed" }, { status: 409 });
  }

  try {
    assertCanReview(user, { providerId: review.resource.providerId });
  } catch (e) {
    if (e instanceof SeparationOfDutiesError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

  const resource = review.resource;
  const lc = resource.lifecycleStatus.code;
  if (lc !== "submitted" && lc !== "in_review") {
    return NextResponse.json(
      { error: "Resource is not awaiting operator review in this queue" },
      { status: 409 }
    );
  }

  const [decidedStatus, listed, needsUpdate, yesR, noR, naR] = await Promise.all([
    prisma.reviewStatusType.findUnique({ where: { code: "decided" } }),
    prisma.lifecycleStatus.findUnique({ where: { code: "listed" } }),
    prisma.lifecycleStatus.findUnique({ where: { code: "needs_update" } }),
    prisma.checklistResultType.findUnique({ where: { code: "yes" } }),
    prisma.checklistResultType.findUnique({ where: { code: "no" } }),
    prisma.checklistResultType.findUnique({ where: { code: "n_a" } })
  ]);
  if (!decidedStatus || !listed || !needsUpdate || !yesR || !noR || !naR) {
    return NextResponse.json({ error: "Reference data not seeded." }, { status: 503 });
  }

  const resultByCode = {
    yes: yesR.id,
    no: noR.id,
    n_a: naR.id
  } as const;

  const checklistRaw =
    body.checklist && typeof body.checklist === "object" && body.checklist !== null
      ? (body.checklist as Record<string, unknown>)
      : null;

  if (decision === "approve") {
    if (!checklistRaw) {
      return NextResponse.json({ error: "checklist required for approve" }, { status: 400 });
    }
    for (const item of SOVEREIGNTY_CHECKLIST_ITEMS) {
      const ans = checklistRaw[item.itemCode];
      if (!isChecklistAnswer(ans)) {
        return NextResponse.json(
          { error: `checklist.${item.itemCode} must be yes | no | n_a` },
          { status: 400 }
        );
      }
      if (ans === "no") {
        return NextResponse.json(
          { error: "Cannot approve when any checklist answer is no" },
          { status: 400 }
        );
      }
    }
  }

  const cfg = getConfig();
  const typeCode = resource.resourceType.code;
  const airId = `air://${cfg.identityDomain}/${typeCode}/${resource.provider.slug}/${resource.slug}`;

  await prisma.$transaction(async (tx) => {
    const checklistCreates =
      decision === "approve" && checklistRaw
        ? SOVEREIGNTY_CHECKLIST_ITEMS.map((item) => ({
            reviewId,
            itemCode: item.itemCode,
            question: item.question,
            resultId: resultByCode[checklistRaw[item.itemCode] as ChecklistAnswerCode]
          }))
        : [];

    if (checklistCreates.length) {
      await tx.reviewChecklistItem.createMany({ data: checklistCreates });
    }

    if (decision === "approve") {
      await tx.resource.update({
        where: { id: resource.id },
        data: {
          lifecycleStatusId: listed.id,
          airId,
          listedAt: new Date(),
          publicVisibility: true,
          lastReviewedAt: new Date()
        }
      });
    } else {
      await tx.resource.update({
        where: { id: resource.id },
        data: {
          lifecycleStatusId: needsUpdate.id,
          lastProviderUpdateAt: new Date()
        }
      });
    }

    await tx.review.update({
      where: { id: reviewId },
      data: {
        statusId: decidedStatus.id,
        reviewerId: user.id,
        completedAt: new Date(),
        decisionSummary: summary,
        startedAt: review.startedAt ?? new Date()
      }
    });
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "review",
    entityId: reviewId,
    action: `review.${decision}`,
    newValue: {
      resourceId: resource.id,
      decision,
      decisionSummary: summary
    }
  });

  return NextResponse.json({
    ok: true,
    reviewId,
    resourceId: resource.id,
    decision,
    lifecycle: decision === "approve" ? "listed" : "needs_update"
  });
}
