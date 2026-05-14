import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { sendEmail } from "@/lib/email";
import { writeAudit } from "@/lib/audit/write-audit";

/**
 * POST /api/admin/complaints/:id/reply
 *
 * Operator reply to the complainant. Body: { subject, message }.
 * Synchronous send (so the operator sees a failure immediately) but the
 * audit log captures the attempt regardless of SMTP outcome.
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

  const complaint = await prisma.complaint.findUnique({
    where: { id },
    select: { id: true, complainantEmail: true, complainantName: true }
  });
  if (!complaint) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!complaint.complainantEmail) {
    return NextResponse.json(
      { error: "Complainant did not provide an email address" },
      { status: 400 }
    );
  }

  const cfg = getConfig();
  const signature = `\n\n— ${cfg.operatorName} · ${cfg.registryName}`;
  const text = `${message}${signature}`;

  const result = await sendEmail({
    to: complaint.complainantEmail,
    subject,
    text
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "complaint",
    entityId: complaint.id,
    action: "complaint.reply_sent",
    newValue: {
      to: complaint.complainantEmail,
      subject,
      messagePreview: message.slice(0, 200),
      channel: result.delivered ? "smtp" : "console",
      delivered: result.delivered
    }
  });

  if (!result.delivered) {
    // Surfaced to the operator so they know SMTP wasn't configured. The
    // message body was still logged to the console fallback.
    return NextResponse.json({
      ok: true,
      delivered: false,
      note: "SMTP not configured; reply logged to operator console"
    });
  }

  return NextResponse.json({ ok: true, delivered: true });
}
