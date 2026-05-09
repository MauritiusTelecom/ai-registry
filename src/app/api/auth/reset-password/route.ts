import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";

/**
 * POST /api/auth/reset-password
 *
 * Body: { token, password }
 *
 * Verifies the token (sha256-hashed lookup + non-expired), updates the user's
 * password, clears the reset token, and writes an audit row.
 */

type ResetPayload = { token?: unknown; password?: unknown };

export async function POST(req: Request) {
  let body: ResetPayload;
  try {
    body = (await req.json()) as ResetPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.token !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "token and password are required" }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const tokenHash = hashToken(body.token);
  const user = await prisma.user.findFirst({ where: { resetToken: tokenHash } });

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(body.password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "user.password_reset"
    }
  });

  return NextResponse.json({ ok: true });
}
