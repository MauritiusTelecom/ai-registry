import { NextResponse } from "next/server";
import { getCurrentUser, deleteAdminContactIfExists } from "@airegistry/sdk/server";

/**
 * DELETE /api/admin/contacts/:id
 *
 * Permanently deletes a public contact-form submission. The audit log
 * retains a redacted snapshot (email + topic + length) so deletions are
 * traceable.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const ok = await deleteAdminContactIfExists(user.id, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
