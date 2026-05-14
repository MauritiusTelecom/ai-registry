import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { writeAudit } from "@/lib/audit/write-audit";
import { isHttpUrl } from "@/lib/validators";

const EDITABLE = new Set(["draft", "needs_update"]);

/**
 * GET /api/portal/resources/:id - full edit-shape payload for the provider
 *   portal edit page (own resources only).
 * PATCH /api/portal/resources/:id - update draft / needs_update fields,
 *   including nested sovereignty evidence, endpoints and language/sector
 *   joins. Governance-only fields (lifecycle, risk, jurisdiction, public
 *   visibility) remain admin-only; providers cannot change them here.
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
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const providerId = await ensureUserProviderLinked(user.id);

  const r = await prisma.resource.findFirst({
    where: { id, providerId },
    include: {
      resourceType: { select: { code: true, name: true } },
      provider: { select: { slug: true, displayName: true } },
      primaryJurisdiction: { select: { code: true, name: true } },
      lifecycleStatus: { select: { code: true, name: true } },
      riskLevel: { select: { code: true, name: true } },
      resourceBases: { include: { sovereigntyBasis: { select: { code: true } } } },
      resourceLanguages: { include: { language: { select: { code: true, name: true } } } },
      resourceSectors: { include: { sector: { select: { code: true, name: true } } } },
      evidence: {
        include: {
          sovereigntyBasis: { select: { code: true } },
          evidenceType: { select: { code: true } }
        }
      },
      endpoints: {
        include: {
          protocol: { select: { code: true } },
          authMethod: { select: { code: true } },
          accessModel: { select: { code: true } },
          lastCheckStatus: { select: { code: true } }
        }
      }
    }
  });
  if (!r) return NextResponse.json({ error: "Resource not found" }, { status: 404 });

  return NextResponse.json({
    id: r.id,
    airId: r.airId,
    slug: r.slug,
    title: r.title,
    shortDescription: r.shortDescription,
    longDescription: r.longDescription,
    kindCode: r.resourceType.code,
    kindName: r.resourceType.name,
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
      active: ep.active
    }))
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const providerId = await ensureUserProviderLinked(user.id);

  const target = await prisma.resource.findFirst({
    where: { id, providerId },
    include: { lifecycleStatus: { select: { code: true } } }
  });
  if (!target) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }
  if (!EDITABLE.has(target.lifecycleStatus.code)) {
    return NextResponse.json(
      { error: "Only draft or needs_update resources can be edited here" },
      { status: 409 }
    );
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
        { error: "shortDescription must be at least 8 characters" },
        { status: 400 }
      );
    }
    data.shortDescription = t;
    before.shortDescription = target.shortDescription;
  }

  const longDescription = nullable(body.longDescription);
  if (longDescription !== undefined) data.longDescription = longDescription;

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
    basisRows = await prisma.sovereigntyBasis.findMany({
      where: { code: { in: basisCodes } },
      select: { id: true, code: true }
    });
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
    languageRows = await prisma.language.findMany({
      where: { code: { in: languageCodes } },
      select: { id: true, code: true }
    });
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
    sectorRows = await prisma.sector.findMany({
      where: { code: { in: sectorCodes } },
      select: { id: true, code: true }
    });
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
      prisma.evidenceType.findMany({
        where: { code: { in: typeCodes } },
        select: { id: true, code: true }
      }),
      prisma.sovereigntyBasis.findMany({
        where: { code: { in: basisCodesEv } },
        select: { id: true, code: true }
      })
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
        submittedById: user.id
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
      prisma.protocol.findMany({
        where: { code: { in: protoCodes } },
        select: { id: true, code: true }
      }),
      prisma.authMethodType.findMany({
        where: { code: { in: authCodes } },
        select: { id: true, code: true }
      }),
      prisma.accessModelType.findMany({
        where: { code: { in: accessCodes } },
        select: { id: true, code: true }
      }),
      prisma.endpointHealthType.findUnique({ where: { code: "unknown" } })
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

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.resource.update({ where: { id }, data });
    }
    if (basisCodes !== undefined) {
      await tx.resourceSovereigntyBasis.deleteMany({ where: { resourceId: id } });
      if (basisRows.length > 0) {
        await tx.resourceSovereigntyBasis.createMany({
          data: basisRows.map((b) => ({
            resourceId: id,
            sovereigntyBasisId: b.id,
            submittedById: user.id
          })),
          skipDuplicates: true
        });
      }
    }
    if (languageCodes !== undefined) {
      await tx.resourceLanguage.deleteMany({ where: { resourceId: id } });
      if (languageRows.length > 0) {
        await tx.resourceLanguage.createMany({
          data: languageRows.map((l) => ({ resourceId: id, languageId: l.id })),
          skipDuplicates: true
        });
      }
    }
    if (sectorCodes !== undefined) {
      await tx.resourceSector.deleteMany({ where: { resourceId: id } });
      if (sectorRows.length > 0) {
        await tx.resourceSector.createMany({
          data: sectorRows.map((s) => ({ resourceId: id, sectorId: s.id })),
          skipDuplicates: true
        });
      }
    }
    if (evidenceResolved !== undefined) {
      await tx.sovereigntyEvidence.deleteMany({ where: { resourceId: id } });
      for (const row of evidenceResolved) {
        await tx.sovereigntyEvidence.create({
          data: { ...row, resourceId: id }
        });
      }
    }
    if (endpointsResolved !== undefined) {
      await tx.resourceEndpoint.deleteMany({ where: { resourceId: id } });
      for (const row of endpointsResolved) {
        await tx.resourceEndpoint.create({
          data: { ...row, resourceId: id }
        });
      }
    }
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "resource",
    entityId: id,
    action: "resource.draft_updated",
    previousValue: before,
    newValue: {
      ...data,
      ...(basisCodes !== undefined ? { sovereigntyBasisCodes: basisCodes } : {}),
      ...(languageCodes !== undefined ? { languageCodes } : {}),
      ...(sectorCodes !== undefined ? { sectorCodes } : {}),
      ...(evidenceResolved !== undefined ? { evidenceCount: evidenceResolved.length } : {}),
      ...(endpointsResolved !== undefined ? { endpointCount: endpointsResolved.length } : {})
    }
  });

  return NextResponse.json({ ok: true });
}
