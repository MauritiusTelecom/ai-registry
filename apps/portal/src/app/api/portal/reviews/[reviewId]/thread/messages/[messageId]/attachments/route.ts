import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { getCurrentUser } from "@airegistry/sdk/server";
import { getAttachmentStorage } from "@airegistry/core";
import {
  AttachmentError,
  ensureCanUploadToMessage,
  ensureThreadQuota,
  extensionFor,
  recordAttachment,
  sanitiseFilename,
  validateAttachmentBasics,
  ALLOWED_ATTACHMENT_TYPES,
  reviewThreadLimits
} from "@airegistry/core/services/review-thread";

import { sniffMimeType } from "@/lib/portal/sniff-mime";

export const runtime = "nodejs";

function errorResponse(err: unknown) {
  if (err instanceof AttachmentError) {
    const statusMap: Record<string, number> = {
      empty_body: 400,
      review_not_found: 404,
      message_not_found: 404,
      attachment_not_found: 404,
      forbidden: 403,
      window_expired: 403,
      too_many_attachments: 400,
      thread_quota_exceeded: 400,
      unsupported_type: 415,
      too_large: 413,
      bytes_type_mismatch: 415
    };
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusMap[err.code] ?? 400 }
    );
  }
  console.error("[review-thread/attachments] unexpected error", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ reviewId: string; messageId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId, messageId } = await ctx.params;

  // Permission + window + count check (cheap, do it before reading the file)
  let perm;
  try {
    perm = await ensureCanUploadToMessage(reviewId, messageId, user);
  } catch (err) {
    return errorResponse(err);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field is required" }, { status: 400 });
  }

  const claimedType = file.type || "application/octet-stream";
  if (!ALLOWED_ATTACHMENT_TYPES.has(claimedType)) {
    return errorResponse(
      new AttachmentError("unsupported_type", `Content type ${claimedType} is not allowed.`)
    );
  }
  if (file.size > reviewThreadLimits.MAX_ATTACHMENT_BYTES) {
    return errorResponse(
      new AttachmentError(
        "too_large",
        `File exceeds ${reviewThreadLimits.MAX_ATTACHMENT_BYTES / 1024 / 1024} MB limit.`
      )
    );
  }

  // Buffer the file (≤10 MB so RAM cost is bounded). Sniff bytes, EXIF-strip if image.
  let buf: Buffer;
  try {
    buf = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Could not read file" }, { status: 400 });
  }

  const sniffedType = sniffMimeType(new Uint8Array(buf.subarray(0, 64)));
  if (!sniffedType || sniffedType !== claimedType) {
    return errorResponse(
      new AttachmentError(
        "bytes_type_mismatch",
        `Declared ${claimedType} but bytes look like ${sniffedType ?? "unknown"}.`
      )
    );
  }

  // EXIF strip for images: re-encode with sharp, dropping all metadata.
  if (IMAGE_TYPES.has(claimedType)) {
    try {
      const pipeline = sharp(buf, { failOn: "error" }).withMetadata({ exif: {} });
      if (claimedType === "image/png") buf = await pipeline.png().toBuffer();
      else if (claimedType === "image/jpeg") buf = await pipeline.jpeg().toBuffer();
      else if (claimedType === "image/gif") buf = await pipeline.gif().toBuffer();
      else if (claimedType === "image/webp") buf = await pipeline.webp().toBuffer();
    } catch (err) {
      console.error("[review-thread/attachments] sharp re-encode failed", err);
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }
  }

  try {
    validateAttachmentBasics({ contentType: claimedType, sizeBytes: buf.length });
    await ensureThreadQuota(perm.thread.id, buf.length);
  } catch (err) {
    return errorResponse(err);
  }

  const attachmentId = randomUUID();
  const ext = extensionFor(claimedType);
  const storageKey = `threads/${perm.thread.id}/${attachmentId}.${ext}`;
  const sanitisedFilename = sanitiseFilename(file.name || `attachment.${ext}`);

  const storage = getAttachmentStorage();
  let put;
  try {
    put = await storage.put(storageKey, Readable.from(buf), { contentType: claimedType });
  } catch (err) {
    console.error("[review-thread/attachments] storage put failed", err);
    return NextResponse.json({ error: "Storage failure" }, { status: 500 });
  }

  let row;
  try {
    row = await recordAttachment({
      messageId,
      uploadedById: user.id,
      filename: sanitisedFilename,
      contentType: claimedType,
      sizeBytes: put.sizeBytes,
      storageKey,
      checksumSha256: put.checksumSha256
    });
  } catch (err) {
    // Roll back the file if DB insert fails
    await storage.delete(storageKey).catch(() => {});
    return errorResponse(err);
  }

  return NextResponse.json(
    {
      id: row.id,
      filename: row.filename,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes,
      checksumSha256: row.checksumSha256,
      createdAt: row.createdAt,
      url: `/api/portal/reviews/${reviewId}/thread/attachments/${row.id}`
    },
    { status: 201 }
  );
}
