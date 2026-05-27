/**
 * Discovery barrel.
 *
 * Single entry point that aggregates serializers, types, and Prisma-backed
 * queries for the public discovery surface. Re-exported through
 * `@airegistry/core` and the `@airegistry/sdk` SemVer contract.
 *
 * Boundary rule: anything re-exported here is callable by apps/portal and by
 * extensions through the SDK. Internal-only helpers (e.g. `buildResourceWhere`,
 * `buildProviderWhere`) MUST stay subpath-scoped and not be added to this
 * barrel.
 */

// Public-safe types (envelopes returned by the discovery surface).
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
  WellKnownDocument
} from "./types";

// Serializers — pure functions over Prisma rows.
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
  toPublicProviderCard
} from "./serializers";

// Prisma-row shapes consumed by the serializers. These leak schema detail
// and SHOULD be wrapped behind higher-level query+serialize service functions
// in a later phase. Included now so apps/portal can migrate without a second
// round of refactoring.
export type {
  ResourceForCard,
  ResourceForDetail,
  ProviderForCard
} from "./serializers";

// Resource queries (visibility-rule enforced — see constitution §5).
export {
  listPublicResources,
  findResourceForDetail,
  findResourcesByCapability
} from "./queries";
export type {
  ListFilters,
  ListPagination
} from "./queries";

// Provider queries (visibility-rule enforced).
export {
  listPublicProviders,
  findProviderForDetail
} from "./provider-queries";
export type {
  ProviderListFilters,
  ProviderListPagination,
  ProviderForDetail
} from "./provider-queries";
