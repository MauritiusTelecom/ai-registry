import { NextResponse } from "next/server";
import {
  getCurrentUser,
  loadMyResourceForEdit,
  loadMyResourceLifecycle,
  resolveAndApplyResourceEdit,
  type RawEditPayload
} from "@airegistry/sdk/server";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";

const EDITABLE = new Set(["draft", "needs_update"]);

/**
 * GET /api/portal/resources/:id - full edit-shape payload for the provider
 *   portal edit page (own resources only).
 * PATCH /api/portal/resources/:id - update draft / needs_update fields,
 *   including nested sovereignty evidence, endpoints and language/sector
 *   joins. Governance-only fields (lifecycle, risk, jurisdiction, public
 *   visibility) remain admin-only; providers cannot change them here.
 *
 * Listed resources are NOT editable here — their edits go through the
 * approval-gated draft flow at `/api/portal/resources/:id/draft`. Both paths
 * share the same validation/apply logic (resolveAndApplyResourceEdit).
 */

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const providerId = await ensureUserProviderLinked(user.id);

  const view = await loadMyResourceForEdit(providerId, id);
  if (!view) return NextResponse.json({ error: "Resource not found" }, { status: 404 });

  return NextResponse.json(view);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: RawEditPayload;
  try {
    body = (await req.json()) as RawEditPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const providerId = await ensureUserProviderLinked(user.id);

  const snapshot = await loadMyResourceLifecycle(providerId, id);
  if (!snapshot.found) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }
  if (!EDITABLE.has(snapshot.target.lifecycleCode)) {
    return NextResponse.json(
      { error: "Only draft or needs_update resources can be edited here" },
      { status: 409 }
    );
  }

  const result = await resolveAndApplyResourceEdit(user.id, id, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, evidenceIds: result.evidenceIds });
}
