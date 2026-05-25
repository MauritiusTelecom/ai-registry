import { NextResponse } from "next/server";

import { getCurrentUser } from "@airegistry/sdk/server";
import { getAttachmentStorage } from "@airegistry/core";
import {
  AttachmentError,
  deleteAttachment
} from "@airegistry/core/services/review-thread";

export const runtime = "nodejs";

function errorResponse(err: unknown) {
  if (err instanceof AttachmentError) {
    const statusMap: Record<string, number> = {
      review_not_found: 404,
      attachment_not_found: 404,
      forbidden: 403
    };
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusMap[err.code] ?? 400 }
    );
  }
  console.error("[review-thread/delete] unexpected error", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ reviewId: string; messageId: string; attachmentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId, attachmentId } = await ctx.params;

  let result;
  try {
    result = await deleteAttachment(reviewId, attachmentId, user);
  } catch (err) {
    return errorResponse(err);
  }

  // Best-effort file removal; the DB row is already gone
  await getAttachmentStorage().delete(result.storageKey).catch((err) => {
    console.warn("[review-thread/delete] file unlink failed (DB row deleted):", err);
  });

  return NextResponse.json({ ok: true });
}
