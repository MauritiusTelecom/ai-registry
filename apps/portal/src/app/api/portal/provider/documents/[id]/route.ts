import { NextResponse } from "next/server";

import { getCurrentUser } from "@airegistry/sdk/server";
import { getAttachmentStorage } from "@airegistry/core";
import {
  DocumentError,
  deleteProviderDocumentRow
} from "@airegistry/core/services/sovereignty-documents";

export const runtime = "nodejs";

function errorResponse(err: unknown) {
  if (err instanceof DocumentError) {
    const statusMap: Record<string, number> = { not_found: 404, forbidden: 403 };
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusMap[err.code] ?? 400 }
    );
  }
  console.error("[provider-documents/delete] unexpected error", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  let result;
  try {
    result = await deleteProviderDocumentRow({ documentId: id, user });
  } catch (err) {
    return errorResponse(err);
  }

  await getAttachmentStorage()
    .delete(result.storageKey)
    .catch((err) => console.warn("[provider-documents/delete] file unlink failed:", err));

  return NextResponse.json({ ok: true });
}
