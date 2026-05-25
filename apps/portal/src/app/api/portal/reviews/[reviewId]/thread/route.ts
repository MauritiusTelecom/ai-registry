import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import {
  loadReviewForAccess,
  loadThreadForReview,
  openThreadForReview,
  setThreadStatusByCode,
  canAccessThread,
  ServiceError,
  isReviewThreadStatusCode,
  type ReviewThreadStatusCode
} from "@airegistry/core/services/review-thread";
import { notifyThreadOpened, notifyThreadResolved } from "@/lib/portal/notify-thread";

function errorResponse(err: unknown) {
  if (err instanceof ServiceError) {
    const statusMap: Record<string, number> = {
      empty_body: 400,
      body_too_long: 400,
      invalid_status: 400,
      review_not_found: 404,
      thread_not_found: 404,
      thread_exists: 409,
      thread_closed: 409,
      forbidden: 403
    };
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusMap[err.code] ?? 400 }
    );
  }
  console.error("[review-thread] unexpected error", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ reviewId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = await ctx.params;
  const review = await loadReviewForAccess(reviewId);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  if (!canAccessThread(user, review)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const thread = await loadThreadForReview(reviewId);
  return NextResponse.json({ thread });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ reviewId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = await ctx.params;
  let body: { message?: string; status?: string } = {};
  try {
    body = (await req.json()) as { message?: string; status?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const statusCode: ReviewThreadStatusCode = isReviewThreadStatusCode(body.status)
    ? body.status
    : "awaiting_provider";

  try {
    const thread = await openThreadForReview(reviewId, user, body.message, statusCode);
    void notifyThreadOpened({
      req,
      reviewId,
      authorName: user.name,
      body: body.message
    });
    return NextResponse.json({ thread }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ reviewId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = await ctx.params;
  let body: { statusCode?: string } = {};
  try {
    body = (await req.json()) as { statusCode?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isReviewThreadStatusCode(body.statusCode)) {
    return NextResponse.json({ error: "Unknown statusCode" }, { status: 400 });
  }

  try {
    const updated = await setThreadStatusByCode(reviewId, user, body.statusCode);
    if (body.statusCode === "resolved") {
      void notifyThreadResolved({ req, reviewId });
    }
    return NextResponse.json({ thread: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
