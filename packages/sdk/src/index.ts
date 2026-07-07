/**
 * @airegistry/sdk — public surface for extensions and third-party portals.
 *
 * Stability: every symbol exported from this file is part of the SDK's
 * SemVer contract. Breaking changes require a major bump and a deprecation
 * window. Internal helpers belong in @airegistry/core.
 *
 * Import strategy: this file re-exports from @airegistry/core SUBPATHS, never
 * from the main "@airegistry/core" barrel. The main barrel pulls in nodemailer
 * (via email.ts) and the Prisma client (via prisma.ts) at module-eval time,
 * which means any client component that imports from @airegistry/sdk would
 * transitively pull Node-only modules into the browser bundle and break the
 * build. Subpath imports let Turbopack include only what's actually needed.
 *
 * If you add a new SDK export, source it from the narrowest core subpath
 * available (see @airegistry/core/package.json exports for the catalogue).
 */

// Deployment configuration shape (read-only for extensions).
export type { RegistryConfig } from "@airegistry/core/config";
export { getConfig } from "@airegistry/core/config";

// Validators that any extension may need (AIR-ID parsing, URL checks, slug).
export {
  isAirId,
  parseAirId,
  isHttpUrl,
  isPublicHttpUrl,
  isSlug
} from "@airegistry/core/validators";
export type { AirIdParts } from "@airegistry/core/validators";

// Path helper (basePath-aware).
export { withBase } from "@airegistry/core/with-base";

// Audit primitive (AIR-SPEC 18.1).
export { writeAudit, countRecentAudit } from "@airegistry/core/audit";

// Discovery surface.
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
  findResourcesByCapability,
  listPublicProviders,
  findProviderForDetail
} from "@airegistry/core/discovery";
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
} from "@airegistry/core/discovery";

// Governance.
export { SOVEREIGNTY_CHECKLIST_ITEMS } from "@airegistry/core/governance";
export type { ChecklistAnswerCode } from "@airegistry/core/governance";

// Admin reference-table registry.
export {
  REF_TABLES,
  getRefTable,
  refTablesByGroup
} from "@airegistry/core/admin/reference-tables";
export type {
  RefFieldKind,
  RefFieldDef,
  RefTableConfig
} from "@airegistry/core/admin/reference-tables";
export {
  projectInputs,
  selectClauseFor
} from "@airegistry/core/admin/ref-payload";
export type { RefPayload } from "@airegistry/core/admin/ref-payload";

// Contact intake.
export {
  CONTACT_TOPIC_CODES,
  CONTACT_TOPIC_LABELS,
  CONTACT_TOPICS
} from "@airegistry/core/contacts/topics";
export type { ContactTopicCode } from "@airegistry/core/contacts/topics";
export { normalizeContactEmail } from "@airegistry/core/contacts/link-to-user";

// Session envelope (TYPE ONLY).
export type { SessionUser } from "@airegistry/core/auth/current-user";

// Separation of duties.
export {
  assertCanReview,
  SeparationOfDutiesError
} from "@airegistry/core/auth/separation-of-duties";
export type { ReviewTarget } from "@airegistry/core/auth/separation-of-duties";

// Plugin manifest types.
export type {
  PluginManifest,
  PluginRestRoute,
  PluginMcpTool,
  PluginCronJob,
  PluginUiSlot,
  PluginPermission,
  PluginLocaleBundle
} from "./plugin";
