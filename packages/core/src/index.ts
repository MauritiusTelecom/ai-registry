/**
 * @airegistry/core — public barrel.
 *
 * Anything re-exported here is part of the SemVer contract for downstream
 * consumers (the default portal under apps/portal, third-party portals,
 * extensions). Internal helpers should NOT be re-exported here; they belong
 * to subpath modules and may change without a major bump.
 *
 * See packages/sdk for the curated public type surface offered to extensions.
 */

// Deployment configuration
export { getConfig, loadConfigForTest, ConfigError } from "./lib/config";
export type { RegistryConfig } from "./lib/config";

// Prisma singleton + generated client types
export { prisma } from "./lib/prisma";

// Validators
export {
  isAirId,
  parseAirId,
  isHttpUrl,
  isPublicHttpUrl,
  isSlug
} from "./lib/validators";
export type { AirIdParts } from "./lib/validators";

// Email
export { sendEmail, emailTemplates, renderTemplate } from "./lib/email";
export type { SendEmailInput, SendEmailResult } from "./lib/email";

// Path helpers
export { withBase } from "./lib/with-base";

// Audit primitive (AIR-SPEC §18)
export { writeAudit } from "./lib/audit/write-audit";

// Governance — sovereignty review checklist (AIR-SPEC §11; constitution §3)
export { SOVEREIGNTY_CHECKLIST_ITEMS } from "./lib/governance/sovereignty-checklist";
export type { ChecklistAnswerCode } from "./lib/governance/sovereignty-checklist";

// Discovery surface (serializers, types, visibility-filtered queries)
export {
  deriveGlyph,
  deriveDisplayStatus,
  isPubliclyVisibleLifecycle,
  toRegistryCard,
  toRegistryCardDetail,
  emptyCounts,
  tallyCounts,
  deriveProviderDisplayStatus,
  providerStatusCodesForBadgeFilter,
  publicProviderKind,
  toPublicProviderCard,
  listPublicResources,
  findResourceForDetail,
  listPublicProviders,
  findProviderForDetail
} from "./lib/discovery";
export type {
  DisplayStatus,
  ResourceKind,
  RegistryCard,
  RegistryCardDetail,
  ResourceEndpointEnvelope,
  PublicEvidenceEnvelope,
  PublicProviderCard,
  CountsByProviderKind,
  PublicProvidersListResponse,
  CountsByKind,
  PublicRegistryListResponse,
  Problem,
  WellKnownDocument,
  ResourceForCard,
  ResourceForDetail,
  ProviderForCard,
  ListFilters,
  ListPagination,
  ProviderListFilters,
  ProviderListPagination,
  ProviderForDetail
} from "./lib/discovery";
