/**
 * Public discovery envelopes (Phase 3).
 *
 * These are the JSON shapes the public REST surface returns. They mirror the
 * contracts in `ai-registry-specs/modules/public/registry/api.yaml` and the
 * card shapes used by the public portal pages so the UI can consume the API
 * response unmodified.
 *
 * The shapes are intentionally **lossy** versus the Prisma models — only
 * fields safe to surface on the unauthenticated public site appear here.
 * Anything in the schema marked internal (e.g. `internalNote`,
 * `passwordHash`, `verificationToken`) MUST NOT cross this boundary.
 */

export type DisplayStatus =
  | "verified"
  | "trusted"
  | "active"
  | "experimental"
  | "isolated";

export type ResourceKind = "model" | "agent" | "tool" | "skill";

export type RegistryCard = {
  id: string;
  /** Public detail route segment (`/registry/[slug]`). */
  slug: string;
  airId: string | null;
  kind: ResourceKind | string;
  glyph: string;
  title: string;
  provider: string;
  status: DisplayStatus;
  desc: string;
  context: string;
  latency: string;
  region: string;
  license: string;
  tags: string[];
};

export type RegistryCardDetail = RegistryCard & {
  longDescription: string | null;
  documentationUrl: string | null;
  sourceCodeUrl: string | null;
  termsUrl: string | null;
  versionLabel: string | null;
  endpoints: ResourceEndpointEnvelope[];
  evidence: PublicEvidenceEnvelope[];
  sovereigntyBases: { code: string; name: string }[];
  governance: {
    declarationStatus: "self_declared" | "registry_reviewed" | "official_resource" | "externally_reviewed";
    sovereigntyReviewStatus: "pending" | "passed" | "failed" | "not_required";
    providerVerificationStatus: "unverified" | "verified" | "official_provider";
    lastReviewed: string | null;
    nextReviewDue: string | null;
  };
  lifecycle: {
    /** Schema lifecycle code — draft / submitted / in_review / listed / needs_update / suspended / deprecated / removed. */
    code: string;
    /** Display name. */
    name: string;
    submittedAt: string | null;
    listedAt: string | null;
    lastProviderUpdateAt: string | null;
  };
};

export type ResourceEndpointEnvelope = {
  protocol: string;
  endpointUrl: string;
  documentationUrl: string | null;
  authMethod: string;
  accessModel: string;
  primary: boolean;
  active: boolean;
};

export type PublicEvidenceEnvelope = {
  title: string;
  description: string | null;
  referenceUrl: string | null;
  evidenceType: string;
  sovereigntyBasis: string;
  issuingBody: string | null;
};

export type PublicProviderCard = {
  id: string;
  /** Stable public slug (registry `?provider=` filter, future profile route). */
  slug: string;
  glyph: string;
  name: string;
  kind: string;
  status: DisplayStatus;
  desc: string;
  jurisdiction: string;
  listings: number;
  since: string;
  license: string | null;
  tags: string[];
  /** Public website when the provider published one. */
  websiteUrl: string | null;
};

/** Kind tab counts for the public providers browse UI (`q` + `status` apply; kind does not). */
export type CountsByProviderKind = {
  all: number;
  sovereign: number;
  model: number;
  hosting: number;
  integrator: number;
};

export type PublicProvidersListResponse = {
  rows: PublicProviderCard[];
  total: number;
  counts: CountsByProviderKind;
  page: { cursor: string | null; size: number; hasMore: boolean };
  generatedAt: string;
};

export type CountsByKind = {
  all: number;
  model: number;
  agent: number;
  skill: number;
  tool: number;
};

export type PublicRegistryListResponse = {
  rows: RegistryCard[];
  total: number;
  counts: CountsByKind;
  page: { cursor: string | null; size: number; hasMore: boolean };
  generatedAt: string;
};

export type Problem = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
};

export type WellKnownDocument = {
  registryName: string;
  identityDomain: string;
  jurisdiction: string;
  apiBaseUrl: string;
  airSpecVersion: "0.4";
  supportedResourceTypes: string[];
  supportedLanguages: string[];
  defaultLanguage: string;
  endpoints: {
    list: string;
    detail: string;
    resolve: string;
    discover: string;
  };
  contact: { operatorName: string };
  generatedAt: string;
};
