import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import {
  appendThreadMessage,
  authorRoleFor,
  ServiceError
} from "@airegistry/core/services/review-thread";
import { notifyThreadReply } from "@/lib/portal/notify-thread";

function errorResponse(err: unknown) {
  if (err instanceof ServiceError) {
    const statusMap: Record<string, number> = {
      empty_body: 400,
      body_too_long: 400,
      review_not_found: 404,
      thread_not_found: 404,
      thread_closed: 409,
      forbidden: 403
    };
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusMap[err.code] ?? 400 }
    );
  }
  console.error("[review-thread/messages] unexpected error", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ reviewId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = await ctx.params;
  let body: { body?: string } = {};
  try {
    body = (await req.json()) as { body?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.body !== "string") {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  try {
    const result = await appendThreadMessage(reviewId, user, body.body);
    void notifyThreadReply({
      req,
      reviewId,
      authorName: user.name,
      authorRole: authorRoleFor(user),
      body: body.body,
      attachmentCount: 0
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
