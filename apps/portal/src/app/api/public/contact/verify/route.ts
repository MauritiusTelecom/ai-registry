import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";

/**
 * GET /api/public/contact/verify?token=<raw>
 *
 * Marks the matching `Contacts` row as `emailVerified` and clears the
 * one-shot token. Idempotent for an already-verified row with no token
 * returns success when... actually we require token. Same semantics as
 * account email verification: invalid/expired → 400 JSON.
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("token");
  if (!raw) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const tokenHash = hashToken(raw);
  const contact = await prisma.contact.findFirst({
    where: { emailVerificationToken: tokenHash }
  });

  if (
    !contact ||
    !contact.emailVerificationExpiry ||
    contact.emailVerificationExpiry < new Date()
  ) {
    return NextResponse.json({ ok: false, reason: "expired_or_invalid" }, { status: 400 });
  }

  if (contact.emailVerified) {
    return NextResponse.json({ ok: true, email: contact.email, alreadyVerified: true });
  }

  await prisma.$transaction([
    prisma.contact.update({
      where: { id: contact.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null
      }
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: contact.linkedUserId,
        entityType: "contact",
        entityId: contact.id,
        action: "contact.email_verified",
        previousValue: { emailVerified: false },
        newValue: { emailVerified: true, email: contact.email }
      }
    })
  ]);

  return NextResponse.json({ ok: true, email: contact.email });
}
