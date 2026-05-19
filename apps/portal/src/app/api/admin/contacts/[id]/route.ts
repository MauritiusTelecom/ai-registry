import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@airegistry/sdk";

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

  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contact.delete({ where: { id } });

  await writeAudit({
    actorUserId: user.id,
    entityType: "contact",
    entityId: id,
    action: "contact.deleted",
    previousValue: {
      email: existing.email,
      topic: existing.topic,
      messageLength: existing.message.length,
      emailVerified: existing.emailVerified
    }
  });

  return NextResponse.json({ ok: true });
}
