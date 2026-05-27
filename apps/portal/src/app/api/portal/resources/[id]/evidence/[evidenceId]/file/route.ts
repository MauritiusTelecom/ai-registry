import { Readable } from "node:stream";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { getCurrentUser } from "@airegistry/sdk/server";
import { getAttachmentStorage } from "@airegistry/core";
import {
  ALLOWED_DOC_TYPES,
  DocumentError,
  MAX_DOC_BYTES,
  attachFileToEvidence,
  canViewEvidenceFile,
  detachFileFromEvidence,
  extensionForDoc,
  isAdminUser,
  loadEvidenceForFileOps,
  sanitiseDocFilename,
  userOwnsResource
} from "@airegistry/core/services/sovereignty-documents";

import { sniffMimeType } from "@/lib/portal/sniff-mime";

export const runtime = "nodejs";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const INLINE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain"
]);

function errorResponse(err: unknown) {
  if (err instanceof DocumentError) {
    const statusMap: Record<string, number> = {
      not_found: 404,
      forbidden: 403,
      invalid_type: 400,
      bytes_type_mismatch: 415,
      too_large: 413
    };
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusMap[err.code] ?? 400 }
    );
  }
  console.error("[evidence/file] unexpected error", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// ── GET: stream the file ─────────────────────────────────
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; evidenceId: string }> }
) {
  const { id: resourceId, evidenceId } = await ctx.params;
  const user = await getCurrentUser();

  let viewable: boolean;
  try {
    viewable = await canViewEvidenceFile({ resourceId, evidenceId, user });
  } catch (err) {
    return errorResponse(err);
  }
  if (!viewable) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const evidence = await loadEvidenceForFileOps({ resourceId, evidenceId });
  if (!evidence.fileStorageKey || !evidence.fileContentType || evidence.fileSizeBytes == null) {
    return NextResponse.json({ error: "No file attached" }, { status: 404 });
  }

  let nodeStream;
  try {
    const res = await getAttachmentStorage().get(evidence.fileStorageKey);
    nodeStream = res.stream;
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }

  const dispositionType = INLINE_TYPES.has(evidence.fileContentType) ? "inline" : "attachment";
  const safeName = (evidence.fileFilename ?? "evidence").replace(/"/g, "");

  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer | string) =>
        controller.enqueue(
          typeof chunk === "string" ? new TextEncoder().encode(chunk) : new Uint8Array(chunk)
        )
      );
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    }
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "content-type": evidence.fileContentType,
      "content-length": String(evidence.fileSizeBytes),
      "content-disposition": `${dispositionType}; filename="${safeName}"`,
      "cache-control": evidence.publicVisibility
        ? "public, max-age=300"
        : "private, max-age=0"
    }
  });
}

// ── POST: upload (or replace) the file on an existing evidence row ──
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; evidenceId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: resourceId, evidenceId } = await ctx.params;
  if (!isAdminUser(user) && !(await userOwnsResource(user, resourceId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let evidence;
  try {
    evidence = await loadEvidenceForFileOps({ resourceId, evidenceId });
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
  if (!ALLOWED_DOC_TYPES.has(claimedType)) {
    return errorResponse(
      new DocumentError("invalid_type", `Content type ${claimedType} is not allowed.`)
    );
  }
  if (file.size > MAX_DOC_BYTES) {
    return errorResponse(
      new DocumentError(
        "too_large",
        `File exceeds ${MAX_DOC_BYTES / 1024 / 1024} MB limit.`
      )
    );
  }

  let buf: Buffer = Buffer.from(await file.arrayBuffer());
  const sniffedType = sniffMimeType(new Uint8Array(buf.subarray(0, 64)));
  if (!sniffedType || sniffedType !== claimedType) {
    return errorResponse(
      new DocumentError(
        "bytes_type_mismatch",
        `Declared ${claimedType} but bytes look like ${sniffedType ?? "unknown"}.`
      )
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
      console.error("[evidence/file] sharp re-encode failed", err);
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }
  }

  const ext = extensionForDoc(claimedType);
  const storageKey = `resources/${resourceId}/${evidenceId}.${ext}`;
  const safeName = sanitiseDocFilename(file.name || `evidence.${ext}`);

  const storage = getAttachmentStorage();

  // If the evidence already has a file, remove it from disk first (we
  // overwrite the same key for the same evidence, but the extension may
  // differ if the new file type changes).
  if (evidence.fileStorageKey && evidence.fileStorageKey !== storageKey) {
    await storage.delete(evidence.fileStorageKey).catch(() => {});
  }

  let put;
  try {
    put = await storage.put(storageKey, Readable.from(buf), { contentType: claimedType });
  } catch (err) {
    console.error("[evidence/file] storage put failed", err);
    return NextResponse.json({ error: "Storage failure" }, { status: 500 });
  }

  let row;
  try {
    row = await attachFileToEvidence({
      evidenceId,
      fileStorageKey: storageKey,
      filename: safeName,
      contentType: claimedType,
      sizeBytes: put.sizeBytes,
      checksumSha256: put.checksumSha256
    });
  } catch (err) {
    await storage.delete(storageKey).catch(() => {});
    console.error("[evidence/file] DB update failed", err);
    return NextResponse.json({ error: "Could not record file" }, { status: 500 });
  }

  return NextResponse.json(
    {
      evidenceId: row.id,
      filename: row.fileFilename,
      contentType: row.fileContentType,
      sizeBytes: row.fileSizeBytes,
      uploadedAt: row.fileUploadedAt,
      url: `/api/portal/resources/${resourceId}/evidence/${row.id}/file`
    },
    { status: 201 }
  );
}

// ── DELETE: detach the file from the evidence row ───────
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; evidenceId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: resourceId, evidenceId } = await ctx.params;
  if (!isAdminUser(user) && !(await userOwnsResource(user, resourceId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let result;
  try {
    result = await detachFileFromEvidence({ evidenceId });
  } catch (err) {
    return errorResponse(err);
  }

  await getAttachmentStorage()
    .delete(result.storageKey)
    .catch((err) => console.warn("[evidence/file/delete] file unlink failed:", err));

  return NextResponse.json({ ok: true });
}
