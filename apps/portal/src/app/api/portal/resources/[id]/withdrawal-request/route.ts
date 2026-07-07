import { NextResponse } from "next/server";
import {
  getCurrentUser,
  loadMyResourceLifecycle,
  loadProviderSummaryById,
  sendTransactionalEmail
} from "@airegistry/sdk/server";
import { getConfig, writeAudit, countRecentAudit } from "@airegistry/sdk";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { getPublicOrigin } from "@/lib/public-origin";

/**
 * POST /api/portal/resources/:id/withdrawal-request
 *
 * Provider-initiated request to have one of their *listed* resources taken
 * down. Unpublishing is a governance action reserved for the operator, so
 * this endpoint does NOT change the lifecycle itself - it records the request
 * (audit) and notifies the operator, who then runs the admin transition
 * (suspend / remove) at /api/admin/resources/:id/transition.
 */

const WITHDRAWAL_ACTION = "resource.withdrawal_requested";
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: { reason?: unknown };
  try {
    body = (await req.json()) as { reason?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 4) {
    return NextResponse.json({ error: "A reason is required (min 4 chars)." }, { status: 400 });
  }

  const providerId = await ensureUserProviderLinked(user.id);

  const snapshot = await loadMyResourceLifecycle(providerId, id);
  if (!snapshot.found) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }
  if (snapshot.target.lifecycleCode !== "listed") {
    return NextResponse.json(
      { error: "Only a listed resource can be withdrawn." },
      { status: 409 }
    );
  }

  // Debounce: don't let repeated clicks spam the operator inbox.
  const recent = await countRecentAudit({
    entityType: "resource",
    entityId: id,
    action: WITHDRAWAL_ACTION,
    sinceMs: DEDUP_WINDOW_MS
  });
  if (recent > 0) {
    return NextResponse.json(
      { error: "A withdrawal request for this resource is already pending with the operator." },
      { status: 409 }
    );
  }

  await writeAudit({
    actorUserId: user.id,
    entityType: "resource",
    entityId: id,
    action: WITHDRAWAL_ACTION,
    newValue: { reason, requestedLifecycle: "withdrawn" }
  });

  // Notify the operator, who actions it via the admin transition endpoint.
  const cfg = getConfig();
  if (cfg.operatorInboxEmail) {
    const origin = getPublicOrigin(req);
    const provider = await loadProviderSummaryById(providerId);
    const providerLabel = provider
      ? `${provider.displayName} (${provider.slug})`
      : providerId;
    const subject = `[${cfg.registryName}] Withdrawal requested: ${snapshot.target.title}`;
    const text = [
      `${providerLabel} has requested withdrawal of a listed resource.`,
      "",
      `Resource: ${snapshot.target.title}`,
      `Reason: ${reason}`,
      "",
      `Review and action (suspend / remove) in the admin resources grid:`,
      `${origin}/admin/resources`
    ].join("\n");
    sendTransactionalEmail("resource_withdrawal_request", {
      to: cfg.operatorInboxEmail,
      subject,
      text
    });
  }

  return NextResponse.json({ ok: true });
}
