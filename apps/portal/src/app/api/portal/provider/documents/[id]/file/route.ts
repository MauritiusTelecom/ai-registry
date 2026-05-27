import { NextResponse } from "next/server";

import { getCurrentUser } from "@airegistry/sdk/server";
import { getAttachmentStorage } from "@airegistry/core";
import {
  DocumentError,
  loadProviderDocumentForServing
} from "@airegistry/core/services/sovereignty-documents";

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
  if (err instanceof DocumentError) {
    const statusMap: Record<string, number> = { not_found: 404, forbidden: 403 };
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusMap[err.code] ?? 400 }
    );
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await getCurrentUser(); // may be null for public docs

  let doc;
  try {
    doc = await loadProviderDocumentForServing({ documentId: id, user });
  } catch (err) {
    return errorResponse(err);
  }

  let nodeStream;
  try {
    const res = await getAttachmentStorage().get(doc.fileStorageKey);
    nodeStream = res.stream;
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }

  const dispositionType = INLINE_TYPES.has(doc.contentType) ? "inline" : "attachment";
  const safeName = doc.filename.replace(/"/g, "");

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
      "content-type": doc.contentType,
      "content-length": String(doc.sizeBytes),
      "content-disposition": `${dispositionType}; filename="${safeName}"`,
      "cache-control": doc.publicVisibility ? "public, max-age=300" : "private, max-age=0"
    }
  });
}
