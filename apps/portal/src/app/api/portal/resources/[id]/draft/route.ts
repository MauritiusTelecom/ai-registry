import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getDraftState,
  openOrGetDraft,
  saveDraftFull,
  discardDraft,
  resolveResourceEdit,
  loadMyResourceLifecycle,
  VersioningError,
  type RawEditPayload
} from "@airegistry/sdk/server";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { authoringGateForbiddenResponse } from "@/lib/portal/authoring-gate-response";

/**
 * Draft-version editing for a LIVE (listed) resource. Edits never touch the
 * published record: they accumulate on a ResourceVersion draft (full payload —
 * scalars + sovereignty bases + evidence + endpoints + language/sector tags)
 * that goes for re-approval. The live listing stays public until the draft is
 * approved, at which point the proposed edit is replayed onto it.
 *
 *   GET    - current draft (if any) + live snapshot + field diff
 *   POST   - open (or return) a draft, snapshotting the live scalars
 *   PATCH  - validate + store the full proposed edit on the draft
 *   DELETE - discard an un-submitted draft
 *
 * draft / needs_update resources are edited in place via the sibling
 * `[id]` route; only `listed` resources route through versioning.
 */

// Lifecycle states from which a provider may open a draft edit.
const DRAFTABLE_LIFECYCLE = new Set(["listed"]);

function versioningErrorResponse(err: unknown): NextResponse {
  if (err instanceof VersioningError) {
    const status =
      err.code === "forbidden"
        ? 403
        : err.code === "not_found"
          ? 404
          : err.code === "seed_missing"
            ? 503
            : 409;
    return NextResponse.json({ error: err.message, code: err.code }, { status });
  }
  throw err;
}

async function requireProvider() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role.code !== "provider") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireProvider();
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  await ensureUserProviderLinked(auth.user.id);

  try {
    const state = await getDraftState(id, auth.user);
    return NextResponse.json(state);
  } catch (err) {
    return versioningErrorResponse(err);
  }
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireProvider();
  if (auth.error) return auth.error;
  if (!auth.user.canAuthorResources) return authoringGateForbiddenResponse();

  const { id } = await ctx.params;
  const providerId = await ensureUserProviderLinked(auth.user.id);

  const snapshot = await loadMyResourceLifecycle(providerId, id);
  if (!snapshot.found) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }
  if (!DRAFTABLE_LIFECYCLE.has(snapshot.target.lifecycleCode)) {
    return NextResponse.json(
      {
        error:
          "Only listed resources are edited via a draft. Draft or needs_update resources are edited directly.",
        code: "not_listed"
      },
      { status: 409 }
    );
  }

  try {
    const draft = await openOrGetDraft(id, auth.user);
    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    return versioningErrorResponse(err);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireProvider();
  if (auth.error) return auth.error;
  if (!auth.user.canAuthorResources) return authoringGateForbiddenResponse();

  const { id } = await ctx.params;
  await ensureUserProviderLinked(auth.user.id);

  let body: RawEditPayload;
  try {
    body = (await req.json()) as RawEditPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate the full payload the same way the live apply would, so the
  // provider gets immediate feedback — but write it to the draft, not live.
  const check = await resolveResourceEdit(auth.user.id, id, body);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const draft = await saveDraftFull(id, auth.user, body);
    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    return versioningErrorResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireProvider();
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  await ensureUserProviderLinked(auth.user.id);

  try {
    const result = await discardDraft(id, auth.user);
    return NextResponse.json(result);
  } catch (err) {
    return versioningErrorResponse(err);
  }
}
