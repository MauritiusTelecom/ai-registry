import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@airegistry/sdk";
import { sendEmail } from "@/lib/email";
import { writeAudit } from "@airegistry/sdk";

/**
 * POST /api/admin/contacts/:id/reply
 *
 * Operator reply to a public contact-form submission. Body: { subject,
 * message }. Reply is sent synchronously so the operator sees SMTP errors
 * immediately.
 */

type Body = { subject?: unknown; message?: unknown };

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subject =
    typeof body.subject === "string" && body.subject.trim() !== ""
      ? body.subject.trim()
      : null;
  const message =
    typeof body.message === "string" && body.message.trim().length >= 4
      ? body.message.trim()
      : null;
  if (!subject) return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const contact = await prisma.contact.findUnique({
    where: { id },
    select: { id: true, email: true, senderName: true }
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cfg = getConfig();
  const signature = `\n\n— ${cfg.operatorName} · ${cfg.registryName}`;
  const text = `${message}${signature}`;

  const result = await sendEmail({
    to: contact.email,
    subject,
    text
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "contact",
    entityId: contact.id,
    action: "contact.reply_sent",
    newValue: {
      to: contact.email,
      subject,
      messagePreview: message.slice(0, 200),
      channel: result.delivered ? "smtp" : "console",
      delivered: result.delivered
    }
  });

  if (!result.delivered) {
    return NextResponse.json({
      ok: true,
      delivered: false,
      note: "SMTP not configured; reply logged to operator console"
    });
  }

  return NextResponse.json({ ok: true, delivered: true });
}
