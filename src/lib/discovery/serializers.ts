/**
 * Public-safe Prisma → REST projections.
 *
 * Every field that crosses this module boundary is deliberately surfaced.
 * Anything not in these projections does not leave the database. In
 * particular:
 *   - `internalNote` / `internalNotes` / `notes_internal` columns
 *   - `passwordHash`, `verificationToken`, `resetToken*`
 *   - `complainantEmail`, `complainantName`
 *   - any `User`-shaped value
 *
 * If a future field needs to be added, add it explicitly here and audit the
 * permissions.md for the corresponding module.
 */

import type {
  Resource,
  ResourceType,
  Provider,
  Jurisdiction,
  LifecycleStatus,
  RiskLevel,
  ResourceTag,
  Tag,
  ResourceLanguage,
  Language,
  ResourceSector,
  Sector,
  ResourceSovereigntyBasis,
  SovereigntyBasis,
  SovereigntyEvidence,
  EvidenceType,
  ResourceEndpoint,
  Protocol,
  AuthMethodType,
  AccessModelType,
  EndpointHealthType,
  TrustSignal,
  TrustSignalType,
  TrustSignalStatusType
} from "../../generated/prisma";
import type {
  CountsByKind,
  DisplayStatus,
  PublicEvidenceEnvelope,
  PublicProviderCard,
  RegistryCard,
  RegistryCardDetail,
  ResourceEndpointEnvelope
} from "./types";

// ─── Glyph derivation ──────────────────────────────────────────────────────

/**
 * Two-character display glyph derived from a name. Mirrors the convention
 * used by the prototype's mock data: first two characters of the leading
 * non-whitespace word, uppercased.
 */
export function deriveGlyph(name: string, fallback = "··"): string {
  const trimmed = (name ?? "").trim();
  if (trimmed === "") return fallback;
  const first = trimmed.split(/[\s\-_/.]+/)[0] ?? "";
  return (first.slice(0, 2) || fallback).toUpperCase();
}

// ─── Display status (lifecycle + trust signals → public badge) ─────────────

const VISIBLE_LIFECYCLE_CODES = new Set(["listed", "deprecated", "needs_update"]);

const TRUST_SIGNAL_PREFERENCE: { code: string; status: DisplayStatus }[] = [
  { code: "official_resource", status: "verified" },
  { code: "sovereignty_review", status: "verified" },
  { code: "provider_verification", status: "trusted" }
];

type ResourceWithLifecycleAndSignals = Resource & {
  lifecycleStatus: LifecycleStatus;
  trustSignals?: (TrustSignal & {
    kind: TrustSignalType;
    status: TrustSignalStatusType;
  })[];
};

/**
 * Derive the public-facing badge from the lifecycle status and any
 * `passed` trust signals. The spec's five values map to the schema as
 * follows (Phase 3 v0.4 — refined in later phases as more trust signal
 * machinery lands):
 *
 *   - lifecycle = removed                         → not surfaced (filtered out)
 *   - lifecycle in {suspended, deprecated}        → isolated
 *   - lifecycle in {submitted, in_review, draft}  → experimental
 *   - lifecycle = listed + official trust signal  → verified
 *   - lifecycle = listed + provider verification  → trusted
 *   - lifecycle = listed (no signals)             → active
 */
export function deriveDisplayStatus(resource: ResourceWithLifecycleAndSignals): DisplayStatus {
  const code = resource.lifecycleStatus.code;
  if (code === "suspended" || code === "deprecated") return "isolated";
  if (code === "submitted" || code === "in_review" || code === "draft" || code === "needs_update") {
    return "experimental";
  }
  if (code === "listed") {
    const passedSignals = (resource.trustSignals ?? []).filter(
      (s) => s.status.code === "passed"
    );
    for (const pref of TRUST_SIGNAL_PREFERENCE) {
      if (passedSignals.some((s) => s.kind.code === pref.code)) return pref.status;
    }
    return "active";
  }
  // Fallback for unexpected codes — treat as experimental rather than crash.
  return "experimental";
}

export function isPubliclyVisibleLifecycle(code: string): boolean {
  return VISIBLE_LIFECYCLE_CODES.has(code) || code === "suspended";
}

// ─── Resource → RegistryCard ───────────────────────────────────────────────

export type ResourceForCard = Resource & {
  resourceType: ResourceType;
  provider: Provider;
  primaryJurisdiction: Jurisdiction;
  lifecycleStatus: LifecycleStatus;
  riskLevel: RiskLevel;
  resourceTags: (ResourceTag & { tag: Tag })[];
  trustSignals?: (TrustSignal & {
    kind: TrustSignalType;
    status: TrustSignalStatusType;
  })[];
  endpoints?: (ResourceEndpoint & { protocol: Protocol })[];
};

function pickContext(r: ResourceForCard): string {
  if (r.versionLabel && r.versionLabel.trim() !== "") return r.versionLabel.trim();
  const primary = r.endpoints?.find((e) => e.primary) ?? r.endpoints?.[0];
  if (primary) return primary.protocol.name;
  return "—";
}

export function toRegistryCard(r: ResourceForCard): RegistryCard {
  return {
    id: r.id,
    airId: r.airId,
    kind: r.resourceType.code,
    glyph: deriveGlyph(r.title || r.slug),
    title: r.title,
    provider: r.provider.displayName,
    status: deriveDisplayStatus(r),
    desc: r.shortDescription,
    context: pickContext(r),
    latency: "—",
    region: r.primaryJurisdiction.code,
    license: r.license ?? "—",
    tags: (r.resourceTags ?? []).map((rt) => rt.tag.name)
  };
}

// ─── Resource → RegistryCardDetail ─────────────────────────────────────────

export type ResourceForDetail = Omit<ResourceForCard, "endpoints"> & {
  evidence?: (SovereigntyEvidence & {
    evidenceType: EvidenceType;
    sovereigntyBasis: SovereigntyBasis;
  })[];
  resourceBases?: (ResourceSovereigntyBasis & {
    sovereigntyBasis: SovereigntyBasis;
  })[];
  endpoints?: (ResourceEndpoint & {
    protocol: Protocol;
    authMethod: AuthMethodType;
    accessModel: AccessModelType;
    lastCheckStatus: EndpointHealthType;
  })[];
  resourceLanguages?: (ResourceLanguage & { language: Language })[];
  resourceSectors?: (ResourceSector & { sector: Sector })[];
};

function deriveDeclarationStatus(
  r: ResourceForDetail
): RegistryCardDetail["governance"]["declarationStatus"] {
  const passed = (r.trustSignals ?? []).filter((s) => s.status.code === "passed");
  if (passed.some((s) => s.kind.code === "official_resource")) return "official_resource";
  if (passed.some((s) => s.kind.code === "sovereignty_review")) return "registry_reviewed";
  return "self_declared";
}

function deriveSovereigntyReviewStatus(
  r: ResourceForDetail
): RegistryCardDetail["governance"]["sovereigntyReviewStatus"] {
  const sovSignals = (r.trustSignals ?? []).filter(
    (s) => s.kind.code === "sovereignty_review"
  );
  if (sovSignals.some((s) => s.status.code === "passed")) return "passed";
  if (sovSignals.some((s) => s.status.code === "failed")) return "failed";
  if (sovSignals.some((s) => s.status.code === "pending")) return "pending";
  return "not_required";
}

function deriveProviderVerificationStatus(
  r: ResourceForDetail
): RegistryCardDetail["governance"]["providerVerificationStatus"] {
  // Placeholder: a real lookup would query the provider's status. v0.4 maps
  // the provider's `statusId` code via the ProviderStatusType reference.
  const code = (r.provider as Provider & { statusCode?: string }).statusCode;
  if (code === "official_provider") return "official_provider";
  if (code === "verified") return "verified";
  return "unverified";
}

export function toRegistryCardDetail(r: ResourceForDetail): RegistryCardDetail {
  const card = toRegistryCard(r);
  const endpoints: ResourceEndpointEnvelope[] = (r.endpoints ?? []).map((e) => ({
    protocol: e.protocol.code,
    endpointUrl: e.endpointUrl,
    documentationUrl: e.documentationUrl,
    authMethod: e.authMethod.code,
    accessModel: e.accessModel.code,
    primary: e.primary,
    active: e.active
  }));
  const evidence: PublicEvidenceEnvelope[] = (r.evidence ?? [])
    .filter((ev) => ev.publicVisibility)
    .map((ev) => ({
      title: ev.title,
      description: ev.description,
      referenceUrl: ev.referenceUrl,
      evidenceType: ev.evidenceType.code,
      sovereigntyBasis: ev.sovereigntyBasis.code,
      issuingBody: ev.issuingBody
    }));

  const sovereigntyBases = (r.resourceBases ?? []).map((rb) => ({
    code: rb.sovereigntyBasis.code,
    name: rb.sovereigntyBasis.name
  }));

  return {
    ...card,
    longDescription: r.longDescription,
    documentationUrl: r.documentationUrl,
    sourceCodeUrl: r.sourceCodeUrl,
    termsUrl: r.termsUrl,
    versionLabel: r.versionLabel,
    endpoints,
    evidence,
    sovereigntyBases,
    governance: {
      declarationStatus: deriveDeclarationStatus(r),
      sovereigntyReviewStatus: deriveSovereigntyReviewStatus(r),
      providerVerificationStatus: deriveProviderVerificationStatus(r),
      lastReviewed: r.lastReviewedAt ? r.lastReviewedAt.toISOString() : null,
      nextReviewDue: r.nextReviewDueAt ? r.nextReviewDueAt.toISOString() : null
    },
    lifecycle: {
      code: r.lifecycleStatus.code,
      name: r.lifecycleStatus.name,
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
      listedAt: r.listedAt ? r.listedAt.toISOString() : null,
      lastProviderUpdateAt: r.lastProviderUpdateAt
        ? r.lastProviderUpdateAt.toISOString()
        : null
    }
  };
}

// ─── Counts ────────────────────────────────────────────────────────────────

export function emptyCounts(): CountsByKind {
  return { all: 0, model: 0, agent: 0, skill: 0, tool: 0 };
}

export function tallyCounts(rows: { kind: string }[]): CountsByKind {
  const counts = emptyCounts();
  counts.all = rows.length;
  for (const r of rows) {
    if (r.kind === "model") counts.model += 1;
    else if (r.kind === "agent") counts.agent += 1;
    else if (r.kind === "skill") counts.skill += 1;
    else if (r.kind === "tool") counts.tool += 1;
  }
  return counts;
}

// ─── Provider envelope ────────────────────────────────────────────────────

export type ProviderForCard = Provider & {
  homeJurisdiction: Jurisdiction;
  type: { code: string; name: string };
  status: { code: string; name: string };
  _count?: { resources: number };
};

const PROVIDER_DISPLAY_STATUS: Record<string, DisplayStatus> = {
  verified: "verified",
  official_provider: "verified",
  unverified: "experimental",
  suspended: "isolated"
};

export function toPublicProviderCard(p: ProviderForCard): PublicProviderCard {
  return {
    id: p.id,
    glyph: deriveGlyph(p.displayName || p.slug),
    name: p.displayName,
    kind: p.type.code,
    status: PROVIDER_DISPLAY_STATUS[p.status.code] ?? "active",
    desc: p.description ?? "",
    jurisdiction: p.homeJurisdiction.code,
    listings: p._count?.resources ?? 0,
    since: p.createdAt.toISOString().slice(0, 7),
    license: null,
    tags: []
  };
}
