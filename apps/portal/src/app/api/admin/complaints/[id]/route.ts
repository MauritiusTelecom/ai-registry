import { NextResponse } from "next/server";
import {
  getCurrentUser,
  deleteAdminComplaintIfExists
} from "@airegistry/sdk/server";

/**
 * DELETE /api/admin/complaints/:id
 *
 * Permanently delete a complaint. Enforcement actions that referenced it
 * survive (the FK is nullable) but their `relatedComplaintId` becomes null.
 * The audit log retains a snapshot of the deleted row.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const ok = await deleteAdminComplaintIfExists(user.id, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
