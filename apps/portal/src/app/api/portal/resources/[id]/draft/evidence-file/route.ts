import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { getCurrentUser } from "@airegistry/sdk/server";
import { getAttachmentStorage } from "@airegistry/core";
import {
  ALLOWED_DOC_TYPES,
  MAX_DOC_BYTES,
  extensionForDoc,
  isAdminUser,
  sanitiseDocFilename,
  userOwnsResource
} from "@airegistry/core/services/sovereignty-documents";

import { sniffMimeType } from "@/lib/portal/sniff-mime";

export const runtime = "nodejs";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

/**
 * POST /api/portal/resources/:id/draft/evidence-file
 *
 * Stage an evidence file for a draft edit of a LIVE resource. The evidence row
 * doesn't exist yet (it lives in the draft's proposedPayload as metadata), so
 * the file is validated and stored under a staging key; the returned reference
 * is carried in the payload and linked to the real evidence row on approval.
 *
 * Same validation as the live evidence upload: type allow-list, size cap, magic
 * byte sniff, and EXIF-stripping re-encode for images.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: resourceId } = await ctx.params;
  if (!isAdminUser(user) && !(await userOwnsResource(user, resourceId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  if (!ALLOWED_DOC_TYPES.has(claimedType)) {
    return NextResponse.json(
      { error: `Content type ${claimedType} is not allowed.`, code: "invalid_type" },
      { status: 400 }
    );
  }
  if (file.size > MAX_DOC_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_DOC_BYTES / 1024 / 1024} MB limit.`, code: "too_large" },
      { status: 413 }
    );
  }

  let buf: Buffer = Buffer.from(await file.arrayBuffer());
  const sniffedType = sniffMimeType(new Uint8Array(buf.subarray(0, 64)));
  if (!sniffedType || sniffedType !== claimedType) {
    return NextResponse.json(
      {
        error: `Declared ${claimedType} but bytes look like ${sniffedType ?? "unknown"}.`,
        code: "bytes_type_mismatch"
      },
      { status: 415 }
    );
  }

  if (IMAGE_TYPES.has(claimedType)) {
    try {
      const pipeline = sharp(buf, { failOn: "error" }).withMetadata({ exif: {} });
      if (claimedType === "image/png") buf = await pipeline.png().toBuffer();
      else if (claimedType === "image/jpeg") buf = await pipeline.jpeg().toBuffer();
      else if (claimedType === "image/gif") buf = await pipeline.gif().toBuffer();
      else if (claimedType === "image/webp") buf = await pipeline.webp().toBuffer();
    } catch (err) {
      console.error("[draft/evidence-file] sharp re-encode failed", err);
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }
  }

  const ext = extensionForDoc(claimedType);
  const storageKey = `draft-staging/${resourceId}/${randomUUID()}.${ext}`;
  const safeName = sanitiseDocFilename(file.name || `evidence.${ext}`);

  const storage = getAttachmentStorage();
  let put;
  try {
    put = await storage.put(storageKey, Readable.from(buf), { contentType: claimedType });
  } catch (err) {
    console.error("[draft/evidence-file] storage put failed", err);
    return NextResponse.json({ error: "Storage failure" }, { status: 500 });
  }

  // Returned ref is embedded in the draft payload's evidence entry and linked
  // to the created evidence row on approval (see resource-versioning.approveDraft).
  return NextResponse.json(
    {
      storageKey,
      filename: safeName,
      contentType: claimedType,
      sizeBytes: put.sizeBytes,
      checksumSha256: put.checksumSha256
    },
    { status: 201 }
  );
}
