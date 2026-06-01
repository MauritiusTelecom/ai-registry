import { NextResponse } from "next/server";

import { getCurrentUser } from "@airegistry/sdk/server";
import {
  BrnVerificationError,
  setBrnVerified
} from "@airegistry/core/services/brn-verification";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "admin" && !user.roles.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { providerId?: string; note?: string } = {};
  try {
    body = (await req.json()) as { providerId?: string; note?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.providerId !== "string") {
    return NextResponse.json({ error: "providerId is required" }, { status: 400 });
  }

  try {
    const updated = await setBrnVerified({
      providerId: body.providerId,
      user,
      note: typeof body.note === "string" ? body.note : undefined
    });
    return NextResponse.json({ ok: true, providerId: updated.id, brnVerifiedAt: updated.brnVerifiedAt });
  } catch (err) {
    if (err instanceof BrnVerificationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    console.error("[admin/brn/verify]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
