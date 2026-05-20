import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { deleteFaqEntry } from "@airegistry/core/services/public-cms";

function adminOnly(user: { roles: string[] } | null) {
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  return null;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const actor = await getCurrentUser();
  const guard = adminOnly(actor);
  if (guard) return guard;

  const { code } = await params;
  await deleteFaqEntry({ actorUserId: actor!.id, code });
  return NextResponse.json({ ok: true });
}
