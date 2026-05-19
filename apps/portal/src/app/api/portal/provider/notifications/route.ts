import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { writeAudit } from "@airegistry/sdk";
import { isHttpUrl } from "@airegistry/sdk";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

type Body = {
  incidentChannel?: unknown;
  oncallEmail?: unknown;
  webhookUrl?: unknown;
};

/**
 * PATCH /api/portal/provider/notifications
 *
 * Saves the Notifications card on /provider/settings (incident channel,
 * on-call email, webhook URL). Each field is optional; passing an empty
 * string clears the value. Aligned with `modules/provider/settings/product.md`.
 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  function nullable(v: unknown): string | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t === "" ? null : t;
  }

  const incidentChannel = nullable(body.incidentChannel);
  const oncallEmail = nullable(body.oncallEmail);
  const webhookUrl = nullable(body.webhookUrl);

  if (oncallEmail && !EMAIL_RE.test(oncallEmail)) {
    return NextResponse.json({ error: "oncallEmail must be a valid email" }, { status: 400 });
  }
  if (webhookUrl && !isHttpUrl(webhookUrl)) {
    return NextResponse.json({ error: "webhookUrl must be an http(s) URL" }, { status: 400 });
  }

  const providerId = await ensureUserProviderLinked(user.id);

  const prev = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { incidentChannel: true, oncallEmail: true, webhookUrl: true }
  });
  if (!prev) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const data: Record<string, string | null> = {};
  if (incidentChannel !== undefined) data.incidentChannel = incidentChannel;
  if (oncallEmail !== undefined) data.oncallEmail = oncallEmail;
  if (webhookUrl !== undefined) data.webhookUrl = webhookUrl;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await prisma.provider.update({ where: { id: providerId }, data });

  await writeAudit({
    actorUserId: user.id,
    entityType: "provider",
    entityId: providerId,
    action: "provider.notifications_updated",
    previousValue: prev,
    newValue: data
  });

  return NextResponse.json({ ok: true, ...data });
}
