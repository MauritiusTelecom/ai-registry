import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { getCurrentUser } from "@airegistry/sdk/server";
import { getAttachmentStorage } from "@airegistry/core";
import {
  ALLOWED_DOC_TYPES,
  DocumentError,
  MAX_DOC_BYTES,
  createProviderDocument,
  extensionForDoc,
  getProviderDocumentTypeIdByCode,
  isAdminUser,
  loadProviderDocuments,
  sanitiseDocFilename,
  userOwnsProvider
} from "@airegistry/core/services/sovereignty-documents";

import { sniffMimeType } from "@/lib/portal/sniff-mime";

export const runtime = "nodejs";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function errorResponse(err: unknown) {
  if (err instanceof DocumentError) {
    const statusMap: Record<string, number> = {
      not_found: 404,
      forbidden: 403,
      invalid_type: 400,
      missing_provider: 400,
      bytes_type_mismatch: 415,
      too_large: 413
    };
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusMap[err.code] ?? 400 }
    );
  }
  console.error("[provider-documents] unexpected error", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providerId = user.provider?.id;
  if (!providerId && !isAdminUser(user)) {
    return NextResponse.json({ error: "Not linked to a provider" }, { status: 400 });
  }
  if (!providerId) {
    // Admin without a provider context — return nothing useful via this route.
    return NextResponse.json({ documents: [] });
  }

  const documents = await loadProviderDocuments({ providerId, includePrivate: true });
  return NextResponse.json({
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      documentType: { code: d.documentType.code, name: d.documentType.name },
      filename: d.filename,
      contentType: d.contentType,
      sizeBytes: d.sizeBytes,
      publicVisibility: d.publicVisibility,
      expiresAt: d.expiresAt,
      uploadedAt: d.uploadedAt,
      uploadedBy: d.uploadedBy,
      url: `/api/portal/provider/documents/${d.id}/file`
    }))
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providerId = user.provider?.id;
  if (!providerId) {
    return NextResponse.json({ error: "Not linked to a provider" }, { status: 400 });
  }
  if (!(await userOwnsProvider(user, providerId)) && !isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });
  }

  const file = formData.get("file");
  const documentTypeCode = formData.get("documentTypeCode");
  const title = formData.get("title");
  const description = formData.get("description");
  const publicVisibilityRaw = formData.get("publicVisibility");
  const expiresAtRaw = formData.get("expiresAt");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field is required" }, { status: 400 });
  }
  if (typeof documentTypeCode !== "string" || documentTypeCode.length === 0) {
    return NextResponse.json({ error: "documentTypeCode is required" }, { status: 400 });
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const documentTypeId = await getProviderDocumentTypeIdByCode(documentTypeCode);
  if (!documentTypeId) {
    return NextResponse.json({ error: "Unknown documentTypeCode" }, { status: 400 });
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

  let buf: Buffer;
  try {
    buf = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Could not read file" }, { status: 400 });
  }

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
      console.error("[provider-documents] sharp re-encode failed", err);
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }
  }

  const documentId = randomUUID();
  const ext = extensionForDoc(claimedType);
  const storageKey = `providers/${providerId}/${documentId}.${ext}`;
  const safeName = sanitiseDocFilename(file.name || `document.${ext}`);

  const storage = getAttachmentStorage();
  let put;
  try {
    put = await storage.put(storageKey, Readable.from(buf), { contentType: claimedType });
  } catch (err) {
    console.error("[provider-documents] storage put failed", err);
    return NextResponse.json({ error: "Storage failure" }, { status: 500 });
  }

  let row;
  try {
    const expiresAt =
      typeof expiresAtRaw === "string" && expiresAtRaw.length > 0
        ? new Date(expiresAtRaw)
        : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new Error("Invalid expiresAt");
    }
    row = await createProviderDocument({
      providerId,
      documentTypeId,
      uploadedById: user.id,
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : null,
      publicVisibility: publicVisibilityRaw === "true" || publicVisibilityRaw === "on",
      expiresAt,
      fileStorageKey: storageKey,
      filename: safeName,
      contentType: claimedType,
      sizeBytes: put.sizeBytes,
      checksumSha256: put.checksumSha256
    });
  } catch (err) {
    await storage.delete(storageKey).catch(() => {});
    console.error("[provider-documents] DB insert failed", err);
    return NextResponse.json({ error: "Could not record document" }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: row.id,
      title: row.title,
      filename: row.filename,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes,
      publicVisibility: row.publicVisibility,
      expiresAt: row.expiresAt,
      uploadedAt: row.uploadedAt,
      url: `/api/portal/provider/documents/${row.id}/file`
    },
    { status: 201 }
  );
}
