import { NextResponse } from "next/server";

import { getCurrentUser } from "@airegistry/sdk/server";
import { getAttachmentStorage } from "@airegistry/core";
import {
  AttachmentError,
  loadAttachmentForServing
} from "@airegistry/core/services/review-thread";

export const runtime = "nodejs";

const INLINE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain"
]);

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
  console.error("[review-thread/serve] unexpected error", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ reviewId: string; attachmentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId, attachmentId } = await ctx.params;

  let attachment;
  try {
    attachment = await loadAttachmentForServing(reviewId, attachmentId, user);
  } catch (err) {
    return errorResponse(err);
  }

  const storage = getAttachmentStorage();
  let stream;
  try {
    const result = await storage.get(attachment.storageKey);
    stream = result.stream;
  } catch (err) {
    console.error("[review-thread/serve] storage get failed", err);
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }

  const dispositionType = INLINE_TYPES.has(attachment.contentType) ? "inline" : "attachment";
  const safeName = attachment.filename.replace(/"/g, "");

  // Convert Node Readable to Web ReadableStream for NextResponse
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk: Buffer | string) =>
        controller.enqueue(
          typeof chunk === "string" ? new TextEncoder().encode(chunk) : new Uint8Array(chunk)
        )
      );
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    }
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "content-type": attachment.contentType,
      "content-length": String(attachment.sizeBytes),
      "content-disposition": `${dispositionType}; filename="${safeName}"`,
      "cache-control": "private, max-age=0"
    }
  });
}
