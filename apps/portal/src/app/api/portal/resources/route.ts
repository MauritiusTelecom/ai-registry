import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getReferenceRow,
  loadMyResourcesList,
  createMyResourceDraft
} from "@airegistry/sdk/server";
import { getConfig } from "@airegistry/sdk";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { authoringGateForbiddenResponse } from "@/lib/portal/authoring-gate-response";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * GET /api/portal/resources?lifecycle=draft
 * POST /api/portal/resources - create draft resource (provider workspace).
 */

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json(
      { error: "Use provider account to list workspace resources." },
      { status: 403 }
    );
  }

  const providerId = await ensureUserProviderLinked(user.id);

  const url = new URL(req.url);
  const lifecycleCode = url.searchParams.get("lifecycle")?.trim() || null;

  const view = await loadMyResourcesList(providerId, lifecycleCode);
  return NextResponse.json(view);
}

type CreateBody = {
  resourceTypeCode?: unknown;
  slug?: unknown;
  title?: unknown;
  shortDescription?: unknown;
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!user.canAuthorResources) return authoringGateForbiddenResponse();

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const typeCode =
    typeof body.resourceTypeCode === "string" ? body.resourceTypeCode.trim().toLowerCase() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const shortDescription =
    typeof body.shortDescription === "string" ? body.shortDescription.trim() : "";

  const cfg = getConfig();
  if (!(cfg.resourceTypes as string[]).includes(typeCode)) {
    return NextResponse.json(
      { error: `resourceTypeCode must be one of: ${cfg.resourceTypes.join(", ")}` },
      { status: 400 }
    );
  }
  if (!SLUG_RE.test(slug) || slug.length < 2 || slug.length > 120) {
    return NextResponse.json(
      { error: "slug must be lowercase letters, digits, hyphens only (2–120 chars)" },
      { status: 400 }
    );
  }
  if (title.length < 2) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (shortDescription.length < 8) {
    return NextResponse.json(
      { error: "shortDescription must be at least 8 characters" },
      { status: 400 }
    );
  }

  const providerId = await ensureUserProviderLinked(user.id);

  const [draft, listingLocal, riskLow, rType, basis, protocolRest, authApiKey, accessRegistered, healthUnknown] =
    await Promise.all([
      getReferenceRow("lifecycleStatus", "draft"),
      getReferenceRow("listingOrigin", "local"),
      getReferenceRow("riskLevel", "low"),
      getReferenceRow("resourceType", typeCode),
      getReferenceRow("sovereigntyBasis", "local_law"),
      getReferenceRow("protocol", "rest"),
      getReferenceRow("authMethodType", "api_key"),
      getReferenceRow("accessModelType", "registered"),
      getReferenceRow("endpointHealthType", "unknown")
    ]);

  if (!draft || !listingLocal || !riskLow || !rType || !basis || !protocolRest || !authApiKey || !accessRegistered || !healthUnknown) {
    return NextResponse.json({ error: "Reference data not seeded." }, { status: 503 });
  }
  // Reject inactive resource types even if a client somehow bypassed the
  // dropdown (curl, stale tab, etc.). UI already filters to active codes;
  // this is the defense-in-depth check.
  if (!rType.active) {
    return NextResponse.json(
      { error: `Resource type "${typeCode}" is not currently available.` },
      { status: 400 }
    );
  }

  const result = await createMyResourceDraft(user.id, providerId, {
    resourceTypeCode: typeCode,
    slug,
    title,
    shortDescription,
    resourceTypeId: rType.id,
    draftStatusId: draft.id,
    listingLocalId: listingLocal.id,
    riskLowId: riskLow.id,
    sovereigntyBasisId: basis.id,
    protocolRestId: protocolRest.id,
    authApiKeyId: authApiKey.id,
    accessRegisteredId: accessRegistered.id,
    endpointHealthUnknownId: healthUnknown.id
  });

  if (!result.ok) {
    if (result.code === "slug_taken") {
      return NextResponse.json(
        { error: "slug already used for this provider" },
        { status: 409 }
      );
    }
    // provider_not_found — shouldn't really happen after ensureUserProviderLinked
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      ok: true,
      resource: {
        id: result.resource.id,
        slug: result.resource.slug,
        title: result.resource.title,
        type: typeCode,
        lifecycle: "draft"
      }
    },
    { status: 201 }
  );
}
