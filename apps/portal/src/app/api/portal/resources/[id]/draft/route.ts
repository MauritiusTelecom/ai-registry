import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getDraftState,
  openOrGetDraft,
  updateDraft,
  discardDraft,
  VersioningError,
  type VersionedFieldPatch
} from "@airegistry/sdk/server";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { authoringGateForbiddenResponse } from "@/lib/portal/authoring-gate-response";
import { loadMyResourceLifecycle } from "@airegistry/sdk/server";
import { isHttpUrl } from "@airegistry/sdk";

/**
 * Draft-version editing for a LIVE (listed) resource. Edits never touch the
 * published record: they accumulate on a ResourceVersion draft that goes for
 * re-approval. The live listing stays public until the draft is approved.
 *
 *   GET    - current draft (if any) + live snapshot + field diff
 *   POST   - open (or return) a draft, snapshotting the live scalars
 *   PATCH  - update the draft's editable scalar fields
 *   DELETE - discard an un-submitted draft
 *
 * draft / needs_update resources are edited in place via the sibling
 * `[id]` route; only `listed` resources route through versioning.
 */

// Lifecycle states from which a provider may open a draft edit. A listed
// resource is public, so its edits must be re-approved before going live.
const DRAFTABLE_LIFECYCLE = new Set(["listed"]);

type PatchBody = {
  title?: unknown;
  shortDescription?: unknown;
  longDescription?: unknown | null;
  versionLabel?: unknown | null;
  versionNumber?: unknown | null;
  latencyTier?: unknown | null;
  license?: unknown | null;
  accessUrl?: unknown | null;
  documentationUrl?: unknown | null;
  sourceCodeUrl?: unknown | null;
  termsUrl?: unknown | null;
};

function nullable(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? null : t;
}

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

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Build a scalar patch. Risk level / jurisdiction / lifecycle stay admin-only
  // and are never accepted here.
  const patch: VersionedFieldPatch = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t.length < 2) {
      return NextResponse.json({ error: "title too short" }, { status: 400 });
    }
    patch.title = t;
  }
  if (typeof body.shortDescription === "string") {
    const t = body.shortDescription.trim();
    if (t.length < 8) {
      return NextResponse.json(
        { error: "shortDescription must be at least 8 characters" },
        { status: 400 }
      );
    }
    patch.shortDescription = t;
  }

  const longDescription = nullable(body.longDescription);
  if (longDescription !== undefined) patch.longDescription = longDescription;
  const versionLabel = nullable(body.versionLabel);
  if (versionLabel !== undefined) patch.versionLabel = versionLabel;
  // Provider-facing version label ("1.0" → "1.1") maps to providerVersionNumber.
  const versionNumber = nullable(body.versionNumber);
  if (versionNumber !== undefined) patch.providerVersionNumber = versionNumber;
  const latencyTier = nullable(body.latencyTier);
  if (latencyTier !== undefined) patch.latencyTier = latencyTier;
  const license = nullable(body.license);
  if (license !== undefined) patch.license = license;

  for (const [key, val] of [
    ["accessUrl", nullable(body.accessUrl)],
    ["documentationUrl", nullable(body.documentationUrl)],
    ["sourceCodeUrl", nullable(body.sourceCodeUrl)],
    ["termsUrl", nullable(body.termsUrl)]
  ] as const) {
    if (val === undefined) continue;
    if (val && !isHttpUrl(val)) {
      return NextResponse.json({ error: `${key} must be http(s)` }, { status: 400 });
    }
    (patch as Record<string, string | null>)[key] = val;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  }

  try {
    const draft = await updateDraft(id, auth.user, patch);
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
