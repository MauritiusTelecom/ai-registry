/**
 * Shared "apply a full resource edit" logic.
 *
 * A resource edit (scalars + sovereignty bases + evidence + endpoints +
 * language/sector tags) arrives as a raw payload from the provider edit form.
 * This module validates it, resolves reference codes to ids, and applies it to
 * the live Resource via applyMyResourceUpdate.
 *
 * Two callers use it:
 *   - PATCH /api/portal/resources/[id]  — direct edit of a draft/needs_update
 *     resource (applies immediately).
 *   - approveDraft (resource-versioning) — applies a listed resource's pending
 *     edit when an admin approves it (the payload was stored on the draft).
 *
 * Keeping it in one place means the provider gets the exact same field set and
 * validation whether the resource is a first-time draft or a live listing going
 * through re-approval.
 */

import { prisma } from "../prisma";
import { isHttpUrl } from "../validators";
import { getReferenceRow, findReferenceRowsByCodes } from "./reference";
import { applyMyResourceUpdate, type ApplyMyResourceUpdateInput } from "./portal";

export type RawEditPayload = {
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

export type EditFailure = { ok: false; error: string; status: number };
export type ResolveResult = { ok: true; input: ApplyMyResourceUpdateInput } | EditFailure;
export type ResolveApplyResult =
  | { ok: true; evidenceIds: string[] | null }
  | EditFailure;

type EvidenceInput = {
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
  protocolCode?: unknown;
  endpointUrl?: unknown;
  documentationUrl?: unknown | null;
  authMethodCode?: unknown;
  accessModelCode?: unknown;
  primary?: unknown;
  active?: unknown;
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

const err = (error: string, status = 400): EditFailure => ({
  ok: false,
  error,
  status
});

/**
 * Validate and resolve a full resource edit into an apply-ready input, WITHOUT
 * writing anything. Scalar fields are diffed against the resource's current
 * values; relations are replaced wholesale when present in the payload. Used
 * both to validate a draft on save/submit and as the first half of
 * resolveAndApplyResourceEdit.
 */
export async function resolveResourceEdit(
  actorUserId: string,
  resourceId: string,
  body: RawEditPayload
): Promise<ResolveResult> {
  const target = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: {
      title: true,
      shortDescription: true,
      longDescription: true,
      license: true,
      versionLabel: true,
      versionNumber: true,
      latencyTier: true,
      accessUrl: true,
      sourceCodeUrl: true,
      documentationUrl: true,
      termsUrl: true
    }
  });
  if (!target) return err("Resource not found", 404);

  const data: Record<string, unknown> = {};
  const before: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t.length < 2) return err("title too short");
    if (t !== target.title) {
      data.title = t;
      before.title = target.title;
    }
  }
  if (typeof body.shortDescription === "string") {
    const t = body.shortDescription.trim();
    if (t.length < 8) return err("shortDescription must be at least 8 characters");
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
    if (accessUrl && !isHttpUrl(accessUrl)) return err("accessUrl must be http(s)");
    data.accessUrl = accessUrl;
  }
  const docUrl = nullable(body.documentationUrl);
  if (docUrl !== undefined) {
    if (docUrl && !isHttpUrl(docUrl)) return err("documentationUrl must be http(s)");
    data.documentationUrl = docUrl;
  }
  const srcUrl = nullable(body.sourceCodeUrl);
  if (srcUrl !== undefined) {
    if (srcUrl && !isHttpUrl(srcUrl)) return err("sourceCodeUrl must be http(s)");
    data.sourceCodeUrl = srcUrl;
  }
  const termsUrl = nullable(body.termsUrl);
  if (termsUrl !== undefined) {
    if (termsUrl && !isHttpUrl(termsUrl)) return err("termsUrl must be http(s)");
    data.termsUrl = termsUrl;
  }

  const basisCodes = asStringArray(body.sovereigntyBasisCodes)?.map((c) => c.toLowerCase());
  const languageCodes = asStringArray(body.languageCodes)?.map((c) => c.toLowerCase());
  const sectorCodes = asStringArray(body.sectorCodes)?.map((c) => c.toLowerCase());

  let basisRows: { id: string; code: string }[] = [];
  if (basisCodes !== undefined && basisCodes.length > 0) {
    basisRows = await findReferenceRowsByCodes("sovereigntyBasis", basisCodes);
    const missing = basisCodes.filter((c) => !basisRows.find((b) => b.code === c));
    if (missing.length) return err(`Unknown sovereignty basis: ${missing.join(", ")}`);
  }

  let languageRows: { id: string; code: string }[] = [];
  if (languageCodes !== undefined && languageCodes.length > 0) {
    languageRows = await findReferenceRowsByCodes("language", languageCodes);
    const missing = languageCodes.filter((c) => !languageRows.find((l) => l.code === c));
    if (missing.length) return err(`Unknown language: ${missing.join(", ")}`);
  }

  let sectorRows: { id: string; code: string }[] = [];
  if (sectorCodes !== undefined && sectorCodes.length > 0) {
    sectorRows = await findReferenceRowsByCodes("sector", sectorCodes);
    const missing = sectorCodes.filter((c) => !sectorRows.find((s) => s.code === c));
    if (missing.length) return err(`Unknown sector: ${missing.join(", ")}`);
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
      if (!t) return err(`evidence[${idx}].evidenceTypeCode unknown: ${tCode || "(empty)"}`);
      if (!b) return err(`evidence[${idx}].sovereigntyBasisCode unknown: ${bCode || "(empty)"}`);
      if (title.length < 2) return err(`evidence[${idx}].title is required`);
      const refUrl = nullable(r.referenceUrl) ?? null;
      if (refUrl && !isHttpUrl(refUrl)) return err(`evidence[${idx}].referenceUrl must be http(s)`);
      evidenceResolved.push({
        sovereigntyBasisId: b.id,
        evidenceTypeId: t.id,
        title,
        description: nullable(r.description) ?? null,
        referenceUrl: refUrl,
        referenceIdentifier: nullable(r.referenceIdentifier) ?? null,
        issuingBody: nullable(r.issuingBody) ?? null,
        publicVisibility: r.publicVisibility !== false,
        submittedById: actorUserId
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
    if (!unknownHealth) return err("Reference data not seeded.", 503);
    endpointsResolved = [];
    for (const [idx, r] of rows.entries()) {
      const pCode = typeof r.protocolCode === "string" ? r.protocolCode.toLowerCase() : "";
      const aCode = typeof r.authMethodCode === "string" ? r.authMethodCode.toLowerCase() : "";
      const xCode = typeof r.accessModelCode === "string" ? r.accessModelCode.toLowerCase() : "";
      const url = typeof r.endpointUrl === "string" ? r.endpointUrl.trim() : "";
      const p = protocols.find((x) => x.code === pCode);
      const a = auths.find((x) => x.code === aCode);
      const x = accesses.find((x) => x.code === xCode);
      if (!p) return err(`endpoints[${idx}].protocolCode unknown: ${pCode || "(empty)"}`);
      if (!a) return err(`endpoints[${idx}].authMethodCode unknown: ${aCode || "(empty)"}`);
      if (!x) return err(`endpoints[${idx}].accessModelCode unknown: ${xCode || "(empty)"}`);
      if (!isHttpUrl(url)) return err(`endpoints[${idx}].endpointUrl must be http(s)`);
      const docUrlEp = nullable(r.documentationUrl) ?? null;
      if (docUrlEp && !isHttpUrl(docUrlEp)) return err(`endpoints[${idx}].documentationUrl must be http(s)`);
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

  if (!hasAnyChange) return err("No fields to update");

  return {
    ok: true,
    input: {
      data,
      before,
      basisRows,
      languageRows,
      sectorRows,
      evidenceResolved,
      endpointsResolved,
      basisCodes,
      languageCodes,
      sectorCodes
    }
  };
}

/**
 * Validate, resolve AND apply a full resource edit to the live resource.
 */
export async function resolveAndApplyResourceEdit(
  actorUserId: string,
  resourceId: string,
  body: RawEditPayload
): Promise<ResolveApplyResult> {
  const resolved = await resolveResourceEdit(actorUserId, resourceId, body);
  if (!resolved.ok) return resolved;
  const result = await applyMyResourceUpdate(actorUserId, resourceId, resolved.input);
  return { ok: true, evidenceIds: result.evidenceIds };
}
