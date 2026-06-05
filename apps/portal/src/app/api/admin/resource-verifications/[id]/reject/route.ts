import { NextResponse } from "next/server";

import {
  getCurrentUser,
  ResourceVerificationError,
  markResourceRequirementRejected
} from "@airegistry/sdk/server";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "admin" && !user.roles.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  let body: { note?: string } = {};
  try {
    body = (await req.json()) as { note?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.note !== "string" || body.note.trim().length === 0) {
    return NextResponse.json({ error: "A reason is required" }, { status: 400 });
  }

  try {
    const updated = await markResourceRequirementRejected({
      verificationId: id,
      user,
      note: body.note
    });
    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err) {
    if (err instanceof ResourceVerificationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    console.error("[admin/resource-verifications/reject]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
