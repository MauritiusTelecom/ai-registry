import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getDraftState,
  listVersions,
  VersioningError
} from "@airegistry/sdk/server";

/**
 * GET /api/admin/resources/:id/versions
 *
 * Admin/reviewer view of a resource's version history plus the pending draft
 * (if any) and a field-level diff of the draft against the live listing. Used
 * by the admin "pending edits" review screen.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin") && !user.roles.includes("reviewer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const [versions, state] = await Promise.all([
      listVersions(id),
      getDraftState(id, user)
    ]);
    return NextResponse.json({
      versions,
      live: state.live,
      draft: state.draft,
      draftStatus: state.draftStatus,
      diff: state.diff
    });
  } catch (err) {
    if (err instanceof VersioningError) {
      const status = err.code === "not_found" ? 404 : err.code === "forbidden" ? 403 : 409;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
