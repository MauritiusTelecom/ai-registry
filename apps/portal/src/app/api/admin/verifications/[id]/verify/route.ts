import { NextResponse } from "next/server";

import { getCurrentUser } from "@airegistry/sdk/server";
import {
  VerificationError,
  markRequirementVerified
} from "@airegistry/core/services/verification";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
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
    // empty body is fine for verify
  }

  try {
    const updated = await markRequirementVerified({
      verificationId: id,
      user,
      note: typeof body.note === "string" ? body.note : undefined
    });
    return NextResponse.json({ ok: true, id: updated.id, verifiedAt: updated.verifiedAt });
  } catch (err) {
    if (err instanceof VerificationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    console.error("[admin/verifications/verify]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
