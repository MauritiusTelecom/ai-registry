import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";

/**
 * GET /api/auth/verify-email?token=<raw>
 *
 * Looks up the user whose `verificationToken` matches `sha256(raw)` and
 * `verificationTokenExpiry > now`. On match: marks `emailVerified = true`,
 * clears the token. The page at `/auth/verify` calls this and renders the
 * outcome to the user.
 *
 * Always returns JSON; never reveals whether a token *previously* existed.
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("token");
  if (!raw) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const tokenHash = hashToken(raw);
  const user = await prisma.user.findFirst({
    where: { verificationToken: tokenHash }
  });

  if (!user || !user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
    return NextResponse.json(
      { ok: false, reason: "expired_or_invalid" },
      { status: 400 }
    );
  }

  // Promote status from `invited` to `active` if appropriate.
  const activeStatus = await prisma.userStatusType.findUnique({
    where: { code: "active" }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
      ...(activeStatus ? { statusId: activeStatus.id } : {})
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "user.email_verified"
    }
  });

  return NextResponse.json({ ok: true, email: user.email });
}
