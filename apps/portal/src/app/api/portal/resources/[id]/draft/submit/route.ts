import { NextResponse } from "next/server";
import {
  getCurrentUser,
  submitDraft,
  VersioningError
} from "@airegistry/sdk/server";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { authoringGateForbiddenResponse } from "@/lib/portal/authoring-gate-response";

/**
 * POST /api/portal/resources/:id/draft/submit
 *
 * Submit the resource's pending draft version for re-approval. Flips the
 * ResourceVersion status draft → submitted. The live listing is untouched and
 * stays public; an admin/verifier approves or rejects the draft separately.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!user.canAuthorResources) return authoringGateForbiddenResponse();

  const { id } = await ctx.params;
  await ensureUserProviderLinked(user.id);

  try {
    const version = await submitDraft(id, user);
    return NextResponse.json({
      ok: true,
      resourceId: id,
      versionId: version.id,
      versionNumber: version.versionNumber,
      status: "submitted"
    });
  } catch (err) {
    if (err instanceof VersioningError) {
      const status =
        err.code === "forbidden"
          ? 403
          : err.code === "not_found"
            ? 404
            : err.code === "no_draft"
              ? 409
              : 409;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
