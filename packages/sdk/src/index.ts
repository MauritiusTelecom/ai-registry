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
 * available — see @airegistry/core/package.json "exports" for the catalogue.
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

// Audit primitive (AIR-SPEC §18.1). Extensions performing governance writes
// MUST funnel through this; writing AuditLog rows directly is prohibited
// (see ai-registry-specs/.speckit/extension-architecture.md §5.3).
export { writeAudit } from "@airegistry/core/audit";

// Discovery surface — serializers, types, and visibility-filtered queries
// that produce public-safe projections. Used by the discovery serializer
// wrapper extension point (extension-architecture.md §5.6 / engineering
// design §5.6). Wrappers MAY append fields but MUST NOT cause an entity
// to appear that the visibility rule excludes.
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

// Governance — sovereignty review checklist (AIR-SPEC §11; constitution §3).
// Extensions rendering review surfaces or contributing checklist items
// (see extension-point-design.md §5.4 portal.review.checklist.items)
// MUST anchor on these definitions; vague tests are out of constitution
// compliance.
export { SOVEREIGNTY_CHECKLIST_ITEMS } from "@airegistry/core/governance";
export type { ChecklistAnswerCode } from "@airegistry/core/governance";

// Admin reference-table registry. Pure data + pure functions describing the
// controlled vocabularies the schema enforces. Extensions rendering ref-table
// CRUD slots (extension-point-design.md §5.4) read from this surface; the
// Prisma-using adapter lives at @airegistry/sdk/server (modelFor etc.).
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

// Contact intake — topic vocabulary and pure helpers. Used by the public
// contact form, the admin contact CRUD, and any extension that wants to
// list or filter on contact topics. The server-only counterpart
// (linkContactsToUser, which accepts a Prisma client) lives in
// @airegistry/sdk/server.
export {
  CONTACT_TOPIC_CODES,
  CONTACT_TOPIC_LABELS,
  CONTACT_TOPICS
} from "@airegistry/core/contacts/topics";
export type { ContactTopicCode } from "@airegistry/core/contacts/topics";
export { normalizeContactEmail } from "@airegistry/core/contacts/link-to-user";

// Session envelope (TYPE ONLY here). The SessionUser type is the public-safe
// view of the authenticated principal (no passwordHash, etc.) and is safe
// for client components to import — TypeScript erases type-only re-exports
// at compile time (isolatedModules: true).
//
// The getCurrentUser ACCESSOR depends on next/headers and therefore lives
// at "@airegistry/sdk/server". Importing it from a client component will
// fail the build, which is the desired behaviour. Extensions performing
// permission checks MUST read the actor from getCurrentUser; spoofing the
// envelope is a constitution §7 violation.
export type { SessionUser } from "@airegistry/core/auth/current-user";

// Separation of duties (constitution §7). Reviewers MUST NOT approve their
// own provider-scoped submissions; assertCanReview throws on violation.
// Extensions invoking review/elevation MUST funnel through this check
// (extension-architecture.md §3.6, §5.5).
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
