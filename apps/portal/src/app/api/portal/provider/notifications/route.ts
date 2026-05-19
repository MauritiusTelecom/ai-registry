import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { isHttpUrl } from "@airegistry/sdk";
import { updateProviderNotificationsConfig } from "@airegistry/sdk/server";

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

  const patch: Record<string, unknown> = {};
  if (incidentChannel !== undefined) patch.incidentChannel = incidentChannel;
  if (oncallEmail !== undefined) patch.oncallEmail = oncallEmail;
  if (webhookUrl !== undefined) patch.webhookUrl = webhookUrl;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  const result = await updateProviderNotificationsConfig(user.id, providerId, patch);
  if (!result) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...result.updated });
}
