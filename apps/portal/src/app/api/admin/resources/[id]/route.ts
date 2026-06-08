import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getReferenceRow,
  findReferenceRowsByCodes,
  findProviderBySlugBasic,
  loadAdminResourceForView,
  loadAdminResourceForEditPrecheck,
  applyAdminResourceUpdate,
  loadAdminResourceForDeleteWithCount,
  deleteAdminResource,
  saveDraftFull,
  submitDraft,
  VersioningError,
  type RawEditPayload
} from "@airegistry/sdk/server";
import { isHttpUrl } from "@airegistry/sdk";

/**
 * GET /api/admin/resources/:id - full edit-shape payload for the admin edit
 *   page (core fields + sovereignty basis codes + evidence rows + endpoints
 *   + language/sector taxonomy joins).
 * PATCH /api/admin/resources/:id - edit metadata fields, including the nested
 *   child collections (evidence, endpoints, language/sector tags, sovereignty
 *   bases). Lifecycle changes still live on the dedicated `/transition`
 *   action route. Slug + provider are immutable post-create.
 * DELETE /api/admin/resources/:id - only when the resource has zero
 *   governance footprint (no AIR-ID issued, no review history). Use the
 *   `remove` transition for a graceful tombstone.
 *
 * See `ai-registry-specs/shared/admin-crud.md` 5.1.
 */

type EvidenceInput = {
  id?: unknown;
  evidenceTypeCode?: unknown;
  sovereigntyBasisCode?: unknown;
  title?: unknown;
  description?: unknown | null;
  referenceUrl?: unknown | null;
  referenceIdentifier?: unknown | null;
  issuingBody?: unknown | null;
  publicVisibility?: unknown;
};

type EndpointInput = {
  id?: unknown;
  protocolCode?: unknown;
  endpointUrl?: unknown;
  documentationUrl?: unknown | null;
  authMethodCode?: unknown;
  accessModelCode?: unknown;
  primary?: unknown;
  active?: unknown;
};

type Body = {
  title?: unknown;
  shortDescription?: unknown;
  longDescription?: unknown | null;
  kindCode?: unknown;
  providerSlug?: unknown;
  listingOriginCode?: unknown;
  riskCode?: unknown;
  versionLabel?: unknown | null;
  versionNumber?: unknown | null;
  latencyTier?: unknown | null;
  license?: unknown | null;
  accessUrl?: unknown | null;
  documentationUrl?: unknown | null;
  sourceCodeUrl?: unknown | null;
  termsUrl?: unknown | null;
  publicVisibility?: unknown;
  jurisdictionCode?: unknown;
  sovereigntyBasisCodes?: unknown;
  languageCodes?: unknown;
  sectorCodes?: unknown;
  evidence?: unknown;
  endpoints?: unknown;
};

function nullable(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? null : t;
}

function asStringArray(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) return undefined;
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const r = await loadAdminResourceForView(id);
  if (!r) return NextResponse.json({ error: "Resource not found" }, { status: 404 });

  return NextResponse.json({
    id: r.id,
    airId: r.airId,
    slug: r.slug,
    title: r.title,
    shortDescription: r.shortDescription,
    longDescription: r.longDescription,
    kindCode: r.resourceType.code,
    providerSlug: r.provider.slug,
    providerName: r.provider.displayName,
    jurisdictionCode: r.primaryJurisdiction.code,
    jurisdictionName: r.primaryJurisdiction.name,
    lifecycleCode: r.lifecycleStatus.code,
    lifecycleName: r.lifecycleStatus.name,
    riskCode: r.riskLevel.code,
    publicVisibility: r.publicVisibility,
    license: r.license,
    versionLabel: r.versionLabel,
    versionNumber: r.versionNumber,
    latencyTier: r.latencyTier,
    accessUrl: r.accessUrl,
    sourceCodeUrl: r.sourceCodeUrl,
    documentationUrl: r.documentationUrl,
    termsUrl: r.termsUrl,
    updatedAt: r.updatedAt.toISOString(),
    sovereigntyBasisCodes: r.resourceBases.map((b) => b.sovereigntyBasis.code),
    languageCodes: r.resourceLanguages.map((l) => l.language.code),
    sectorCodes: r.resourceSectors.map((s) => s.sector.code),
    evidence: r.evidence.map((e) => ({
      id: e.id,
      evidenceTypeCode: e.evidenceType.code,
      sovereigntyBasisCode: e.sovereigntyBasis.code,
      title: e.title,
      description: e.description,
      referenceUrl: e.referenceUrl,
      referenceIdentifier: e.referenceIdentifier,
      issuingBody: e.issuingBody,
      publicVisibility: e.publicVisibility
    })),
    endpoints: r.endpoints.map((ep) => ({
      id: ep.id,
      protocolCode: ep.protocol.code,
      endpointUrl: ep.endpointUrl,
      documentationUrl: ep.documentationUrl,
      authMethodCode: ep.authMethod.code,
      accessModelCode: ep.accessModel.code,
      primary: ep.primary,
      active: ep.active,
      lastCheckStatusCode: ep.lastCheckStatus.code
    }))
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const target = await loadAdminResourceForEditPrecheck(id);
  if (!target) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  const before: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t.length < 2) {
      return NextResponse.json({ error: "title too short" }, { status: 400 });
    }
    if (t !== target.title) {
      data.title = t;
      before.title = target.title;
    }
  }
  if (typeof body.shortDescription === "string") {
    const t = body.shortDescription.trim();
    if (t.length < 8) {
      return NextResponse.json(
        { error: "shortDescription must be at least 8 chars" },
        { status: 400 }
      );
    }
    data.shortDescription = t;
    before.shortDescription = target.shortDescription;
  }

  const longDescription = nullable(body.longDescription);
  if (longDescription !== undefined) data.longDescription = longDescription;

  if (typeof body.riskCode === "string" && body.riskCode.trim() !== "") {
    const code = body.riskCode.trim().toLowerCase();
    if (code !== target.riskLevel.code) {
      const r = await getReferenceRow("riskLevel", code);
      if (!r) return NextResponse.json({ error: "Unknown riskCode" }, { status: 400 });
      data.riskLevelId = r.id;
      before.risk = target.riskLevel.code;
    }
  }

  if (typeof body.jurisdictionCode === "string" && body.jurisdictionCode.trim() !== "") {
    const code = body.jurisdictionCode.trim().toUpperCase();
    if (code !== target.primaryJurisdiction.code) {
      const j = await getReferenceRow("jurisdiction", code);
      if (!j) return NextResponse.json({ error: "Unknown jurisdictionCode" }, { status: 400 });
      data.primaryJurisdictionId = j.id;
      before.jurisdiction = target.primaryJurisdiction.code;
    }
  }

  if (typeof body.kindCode === "string" && body.kindCode.trim() !== "") {
    const code = body.kindCode.trim().toLowerCase();
    if (code !== target.resourceType.code) {
      const rt = await getReferenceRow("resourceType", code);
      if (!rt) return NextResponse.json({ error: "Unknown kindCode" }, { status: 400 });
      if (!rt.active) {
        return NextResponse.json(
          { error: `Resource type "${code}" is not currently available.` },
          { status: 400 }
        );
      }
      data.resourceTypeId = rt.id;
      before.kind = target.resourceType.code;
    }
  }

  if (typeof body.providerSlug === "string" && body.providerSlug.trim() !== "") {
    const slug = body.providerSlug.trim().toLowerCase();
    if (slug !== target.provider.slug) {
      const p = await findProviderBySlugBasic(slug);
      if (!p) {
        return NextResponse.json({ error: "Unknown providerSlug" }, { status: 400 });
      }
      data.providerId = p.id;
      before.provider = target.provider.slug;
    }
  }

  if (typeof body.listingOriginCode === "string" && body.listingOriginCode.trim() !== "") {
    const code = body.listingOriginCode.trim().toLowerCase();
    if (code !== target.listingOrigin.code) {
      const lo = await getReferenceRow("listingOrigin", code);
      if (!lo) {
        return NextResponse.json({ error: "Unknown listingOriginCode" }, { status: 400 });
      }
      data.listingOriginId = lo.id;
      before.listingOrigin = target.listingOrigin.code;
    }
  }

  if (typeof body.publicVisibility === "boolean") {
    data.publicVisibility = body.publicVisibility;
  }

  const versionLabel = nullable(body.versionLabel);
  if (versionLabel !== undefined) data.versionLabel = versionLabel;
  const versionNumber = nullable(body.versionNumber);
  if (versionNumber !== undefined) data.versionNumber = versionNumber;
  const latencyTier = nullable(body.latencyTier);
  if (latencyTier !== undefined) data.latencyTier = latencyTier;
  const license = nullable(body.license);
  if (license !== undefined) data.license = license;

  const accessUrl = nullable(body.accessUrl);
  if (accessUrl !== undefined) {
    if (accessUrl && !isHttpUrl(accessUrl)) {
      return NextResponse.json({ error: "accessUrl must be http(s)" }, { status: 400 });
    }
    data.accessUrl = accessUrl;
  }
  const docUrl = nullable(body.documentationUrl);
  if (docUrl !== undefined) {
    if (docUrl && !isHttpUrl(docUrl)) {
      return NextResponse.json({ error: "documentationUrl must be http(s)" }, { status: 400 });
    }
    data.documentationUrl = docUrl;
  }
  const srcUrl = nullable(body.sourceCodeUrl);
  if (srcUrl !== undefined) {
    if (srcUrl && !isHttpUrl(srcUrl)) {
      return NextResponse.json({ error: "sourceCodeUrl must be http(s)" }, { status: 400 });
    }
    data.sourceCodeUrl = srcUrl;
  }
  const termsUrl = nullable(body.termsUrl);
  if (termsUrl !== undefined) {
    if (termsUrl && !isHttpUrl(termsUrl)) {
      return NextResponse.json({ error: "termsUrl must be http(s)" }, { status: 400 });
    }
    data.termsUrl = termsUrl;
  }

  const basisCodes = asStringArray(body.sovereigntyBasisCodes)?.map((c) => c.toLowerCase());
  const languageCodes = asStringArray(body.languageCodes)?.map((c) => c.toLowerCase());
  const sectorCodes = asStringArray(body.sectorCodes)?.map((c) => c.toLowerCase());

  let basisRows: { id: string; code: string }[] = [];
  if (basisCodes !== undefined && basisCodes.length > 0) {
    basisRows = await findReferenceRowsByCodes("sovereigntyBasis", basisCodes);
    const missing = basisCodes.filter((c) => !basisRows.find((b) => b.code === c));
    if (missing.length) {
      return NextResponse.json(
        { error: `Unknown sovereignty basis: ${missing.join(", ")}` },
        { status: 400 }
      );
    }
  }

  let languageRows: { id: string; code: string }[] = [];
  if (languageCodes !== undefined && languageCodes.length > 0) {
    languageRows = await findReferenceRowsByCodes("language", languageCodes);
    const missing = languageCodes.filter((c) => !languageRows.find((l) => l.code === c));
    if (missing.length) {
      return NextResponse.json(
        { error: `Unknown language: ${missing.join(", ")}` },
        { status: 400 }
      );
    }
  }

  let sectorRows: { id: string; code: string }[] = [];
  if (sectorCodes !== undefined && sectorCodes.length > 0) {
    sectorRows = await findReferenceRowsByCodes("sector", sectorCodes);
    const missing = sectorCodes.filter((c) => !sectorRows.find((s) => s.code === c));
    if (missing.length) {
      return NextResponse.json(
        { error: `Unknown sector: ${missing.join(", ")}` },
        { status: 400 }
      );
    }
  }

  type EvidenceResolved = {
    sovereigntyBasisId: string;
    evidenceTypeId: string;
    title: string;
    description: string | null;
    referenceUrl: string | null;
    referenceIdentifier: string | null;
    issuingBody: string | null;
    publicVisibility: boolean;
    submittedById: string;
  };
  let evidenceResolved: EvidenceResolved[] | undefined;
  if (Array.isArray(body.evidence)) {
    const rows = body.evidence as EvidenceInput[];
    const typeCodes = Array.from(
      new Set(
        rows
          .map((r) => (typeof r.evidenceTypeCode === "string" ? r.evidenceTypeCode.toLowerCase() : ""))
          .filter(Boolean)
      )
    );
    const basisCodesEv = Array.from(
      new Set(
        rows
          .map((r) => (typeof r.sovereigntyBasisCode === "string" ? r.sovereigntyBasisCode.toLowerCase() : ""))
          .filter(Boolean)
      )
    );
    const [types, bases] = await Promise.all([
      findReferenceRowsByCodes("evidenceType", typeCodes),
      findReferenceRowsByCodes("sovereigntyBasis", basisCodesEv)
    ]);
    evidenceResolved = [];
    for (const [idx, r] of rows.entries()) {
      const tCode = typeof r.evidenceTypeCode === "string" ? r.evidenceTypeCode.toLowerCase() : "";
      const bCode = typeof r.sovereigntyBasisCode === "string" ? r.sovereigntyBasisCode.toLowerCase() : "";
      const t = types.find((x) => x.code === tCode);
      const b = bases.find((x) => x.code === bCode);
      const title = typeof r.title === "string" ? r.title.trim() : "";
      if (!t) {
        return NextResponse.json(
          { error: `evidence[${idx}].evidenceTypeCode unknown: ${tCode || "(empty)"}` },
          { status: 400 }
        );
      }
      if (!b) {
        return NextResponse.json(
          { error: `evidence[${idx}].sovereigntyBasisCode unknown: ${bCode || "(empty)"}` },
          { status: 400 }
        );
      }
      if (title.length < 2) {
        return NextResponse.json(
          { error: `evidence[${idx}].title is required` },
          { status: 400 }
        );
      }
      const refUrl = nullable(r.referenceUrl) ?? null;
      if (refUrl && !isHttpUrl(refUrl)) {
        return NextResponse.json(
          { error: `evidence[${idx}].referenceUrl must be http(s)` },
          { status: 400 }
        );
      }
      evidenceResolved.push({
        sovereigntyBasisId: b.id,
        evidenceTypeId: t.id,
        title,
        description: nullable(r.description) ?? null,
        referenceUrl: refUrl,
        referenceIdentifier: nullable(r.referenceIdentifier) ?? null,
        issuingBody: nullable(r.issuingBody) ?? null,
        publicVisibility: r.publicVisibility !== false,
        submittedById: actor.id
      });
    }
  }

  type EndpointResolved = {
    protocolId: string;
    endpointUrl: string;
    documentationUrl: string | null;
    authMethodId: string;
    accessModelId: string;
    primary: boolean;
    active: boolean;
    lastCheckStatusId: string;
  };
  let endpointsResolved: EndpointResolved[] | undefined;
  if (Array.isArray(body.endpoints)) {
    const rows = body.endpoints as EndpointInput[];
    const protoCodes = Array.from(
      new Set(
        rows
          .map((r) => (typeof r.protocolCode === "string" ? r.protocolCode.toLowerCase() : ""))
          .filter(Boolean)
      )
    );
    const authCodes = Array.from(
      new Set(
        rows
          .map((r) => (typeof r.authMethodCode === "string" ? r.authMethodCode.toLowerCase() : ""))
          .filter(Boolean)
      )
    );
    const accessCodes = Array.from(
      new Set(
        rows
          .map((r) => (typeof r.accessModelCode === "string" ? r.accessModelCode.toLowerCase() : ""))
          .filter(Boolean)
      )
    );
    const [protocols, auths, accesses, unknownHealth] = await Promise.all([
      findReferenceRowsByCodes("protocol", protoCodes),
      findReferenceRowsByCodes("authMethodType", authCodes),
      findReferenceRowsByCodes("accessModelType", accessCodes),
      getReferenceRow("endpointHealthType", "unknown")
    ]);
    if (!unknownHealth) {
      return NextResponse.json({ error: "Reference data not seeded." }, { status: 503 });
    }
    endpointsResolved = [];
    for (const [idx, r] of rows.entries()) {
      const pCode = typeof r.protocolCode === "string" ? r.protocolCode.toLowerCase() : "";
      const aCode = typeof r.authMethodCode === "string" ? r.authMethodCode.toLowerCase() : "";
      const xCode = typeof r.accessModelCode === "string" ? r.accessModelCode.toLowerCase() : "";
      const url = typeof r.endpointUrl === "string" ? r.endpointUrl.trim() : "";
      const p = protocols.find((x) => x.code === pCode);
      const a = auths.find((x) => x.code === aCode);
      const x = accesses.find((x) => x.code === xCode);
      if (!p) {
        return NextResponse.json(
          { error: `endpoints[${idx}].protocolCode unknown: ${pCode || "(empty)"}` },
          { status: 400 }
        );
      }
      if (!a) {
        return NextResponse.json(
          { error: `endpoints[${idx}].authMethodCode unknown: ${aCode || "(empty)"}` },
          { status: 400 }
        );
      }
      if (!x) {
        return NextResponse.json(
          { error: `endpoints[${idx}].accessModelCode unknown: ${xCode || "(empty)"}` },
          { status: 400 }
        );
      }
      if (!isHttpUrl(url)) {
        return NextResponse.json(
          { error: `endpoints[${idx}].endpointUrl must be http(s)` },
          { status: 400 }
        );
      }
      const docUrlEp = nullable(r.documentationUrl) ?? null;
      if (docUrlEp && !isHttpUrl(docUrlEp)) {
        return NextResponse.json(
          { error: `endpoints[${idx}].documentationUrl must be http(s)` },
          { status: 400 }
        );
      }
      endpointsResolved.push({
        protocolId: p.id,
        endpointUrl: url,
        documentationUrl: docUrlEp,
        authMethodId: a.id,
        accessModelId: x.id,
        primary: r.primary === true,
        active: r.active !== false,
        lastCheckStatusId: unknownHealth.id
      });
    }
  }

  const hasAnyChange =
    Object.keys(data).length > 0 ||
    basisCodes !== undefined ||
    languageCodes !== undefined ||
    sectorCodes !== undefined ||
    evidenceResolved !== undefined ||
    endpointsResolved !== undefined;

  if (!hasAnyChange) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Approval gate for live resources. When an admin edits a LISTED resource,
  // content changes (descriptions, URLs, evidence, endpoints, taxonomy) are
  // held as a draft for approval instead of publishing instantly — the live
  // listing stays public until the admin approves the draft. Governance fields
  // (risk, jurisdiction, kind, provider, listing origin, visibility) remain the
  // admin's immediate prerogative and apply directly.
  const GOVERNANCE_KEYS = new Set([
    "riskLevelId",
    "primaryJurisdictionId",
    "resourceTypeId",
    "providerId",
    "listingOriginId",
    "publicVisibility"
  ]);
  const isListed = target.lifecycleStatus.code === "listed";
  const govData: Record<string, unknown> = {};
  const contentData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (GOVERNANCE_KEYS.has(k)) govData[k] = v;
    else contentData[k] = v;
  }
  const hasContentChange =
    Object.keys(contentData).length > 0 ||
    basisCodes !== undefined ||
    languageCodes !== undefined ||
    sectorCodes !== undefined ||
    evidenceResolved !== undefined ||
    endpointsResolved !== undefined;

  if (isListed && hasContentChange) {
    // Governance fields apply immediately (no relation changes here).
    if (Object.keys(govData).length > 0) {
      await applyAdminResourceUpdate(actor.id, id, {
        data: govData,
        before,
        newValue: { ...govData },
        basisRows: [],
        languageRows: [],
        sectorRows: [],
        action: "resource.updated"
      });
    }
    // Hold content edits as a draft and submit for approval. The editing admin
    // can approve their own draft (staff carry no provider conflict), so they
    // are redirected to the diff/approve screen.
    try {
      await saveDraftFull(id, actor, body as RawEditPayload);
      await submitDraft(id, actor);
    } catch (err) {
      if (err instanceof VersioningError) {
        return NextResponse.json(
          {
            error:
              err.code === "not_editable"
                ? "An update is already pending approval for this resource. Approve or discard it first."
                : err.message,
            code: err.code
          },
          { status: 409 }
        );
      }
      throw err;
    }
    return NextResponse.json({ ok: true, pendingDraft: true, resourceId: id });
  }

  await applyAdminResourceUpdate(actor.id, id, {
    data,
    before,
    newValue: {
      ...data,
      ...(basisCodes !== undefined ? { sovereigntyBasisCodes: basisCodes } : {}),
      ...(languageCodes !== undefined ? { languageCodes } : {}),
      ...(sectorCodes !== undefined ? { sectorCodes } : {}),
      ...(evidenceResolved !== undefined ? { evidenceCount: evidenceResolved.length } : {}),
      ...(endpointsResolved !== undefined ? { endpointCount: endpointsResolved.length } : {})
    },
    basisRows,
    languageRows,
    sectorRows,
    evidenceResolved,
    endpointsResolved,
    basisCodes,
    languageCodes,
    sectorCodes,
    action: "resource.updated"
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const target = await loadAdminResourceForDeleteWithCount(id);
  if (!target) return NextResponse.json({ error: "Resource not found" }, { status: 404 });

  const blockers = Object.entries(target._count).filter(([, n]) => n > 0);
  if (target.airId || blockers.length > 0) {
    return NextResponse.json(
      {
        error: "Resource has governance footprint. Use the `remove` transition to tombstone it instead.",
        detail:
          (target.airId ? `airId=${target.airId}; ` : "") +
          blockers.map(([k, n]) => `${k}=${n}`).join(", ")
      },
      { status: 409, headers: { "content-type": "application/problem+json" } }
    );
  }

  try {
    await deleteAdminResource(actor.id, id, {
      slug: target.slug,
      title: target.title
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Delete failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
