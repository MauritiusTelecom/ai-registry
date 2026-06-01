/**
 * Prisma query helpers for the public discovery surface.
 *
 * Centralises the include-shape every list/detail query needs so the API
 * routes don't drift on which relations are eager-loaded. Also enforces the
 * spec's visibility predicate (constitution §5): only resources whose
 * lifecycle and provider posture allow public listing are returned.
 */

import type { Prisma } from "../../generated/prisma";
import { prisma } from "../prisma";
import { tallyCounts, toRegistryCard, type ResourceForCard } from "./serializers";
import type {
  CountsByKind,
  DisplayStatus,
  PublicRegistryListResponse,
  RegistryCard,
  ResourceKind
} from "./types";

// ─── Filters ───────────────────────────────────────────────────────────────

export type ListFilters = {
  q: string | null;
  kind: ResourceKind | null;
  /** Public UI badge filter (`verified` | `trusted` | …); matches `deriveDisplayStatus` rules in serializers. */
  status: string | null;
  jurisdictionCode: string | null;
  providerSlug: string | null;
  sovereigntyBasisCode: string | null;
  protocolCode: string | null;
  languageCode: string | null;
};

export type ListPagination = {
  /** 1..200, default 20. */
  limit: number;
  /** Resource id of the row to skip past. */
  cursor: string | null;
};

const PUBLIC_LIFECYCLE_CODES = ["listed", "deprecated", "needs_update", "suspended"];

const RESOURCE_INCLUDE = {
  resourceType: true,
  provider: true,
  primaryJurisdiction: true,
  lifecycleStatus: true,
  riskLevel: true,
  resourceTags: { include: { tag: true } },
  trustSignals: { include: { kind: true, status: true } },
  endpoints: { include: { protocol: true } }
} satisfies Prisma.ResourceInclude;

const RESOURCE_DETAIL_INCLUDE = {
  ...RESOURCE_INCLUDE,
  resourceBases: { include: { sovereigntyBasis: true } },
  evidence: { include: { evidenceType: true, sovereigntyBasis: true } },
  resourceLanguages: { include: { language: true } },
  resourceSectors: { include: { sector: true } },
  endpoints: {
    include: {
      protocol: true,
      authMethod: true,
      accessModel: true,
      lastCheckStatus: true
    }
  }
} satisfies Prisma.ResourceInclude;

// ─── List query ────────────────────────────────────────────────────────────

const TRUST_KIND_VERIFIED = ["official_resource", "sovereignty_review"] as const;

function normalizeDisplayStatus(raw: string | null): DisplayStatus | null {
  if (!raw || raw.trim() === "") return null;
  const s = raw.trim().toLowerCase();
  const allowed: DisplayStatus[] = ["verified", "trusted", "active", "experimental", "isolated"];
  return allowed.includes(s as DisplayStatus) ? (s as DisplayStatus) : null;
}

/** Maps public UI badge to DB predicates (aligned with `deriveDisplayStatus`). */
function displayStatusWhereClause(status: DisplayStatus): Prisma.ResourceWhereInput {
  switch (status) {
    case "isolated":
      return { lifecycleStatus: { code: { in: ["suspended", "deprecated"] } } };
    case "experimental":
      return { lifecycleStatus: { code: "needs_update" } };
    case "verified":
      return {
        AND: [
          { lifecycleStatus: { code: "listed" } },
          {
            trustSignals: {
              some: {
                status: { code: "passed" },
                kind: { code: { in: [...TRUST_KIND_VERIFIED] } }
              }
            }
          }
        ]
      };
    case "trusted":
      return {
        AND: [
          { lifecycleStatus: { code: "listed" } },
          {
            trustSignals: {
              some: {
                status: { code: "passed" },
                kind: { code: "provider_verification" }
              }
            }
          },
          {
            NOT: {
              trustSignals: {
                some: {
                  status: { code: "passed" },
                  kind: { code: { in: [...TRUST_KIND_VERIFIED] } }
                }
              }
            }
          }
        ]
      };
    case "active":
      return {
        AND: [
          { lifecycleStatus: { code: "listed" } },
          {
            NOT: {
              trustSignals: {
                some: {
                  status: { code: "passed" },
                  kind: {
                    code: { in: [...TRUST_KIND_VERIFIED, "provider_verification"] }
                  }
                }
              }
            }
          }
        ]
      };
    default:
      return { lifecycleStatus: { code: { in: PUBLIC_LIFECYCLE_CODES } } };
  }
}

export async function buildResourceWhere(
  filters: ListFilters
): Promise<Prisma.ResourceWhereInput> {
  const and: Prisma.ResourceWhereInput[] = [
    { publicVisibility: true },
    // Provider must have every applicable verification requirement
    // satisfied. "Applicable" is determined by the loaded extension
    // manifests; see packages/core/src/lib/services/verification.ts.
    { provider: { verifications: { none: { verifiedAt: null } } } }
  ];

  const badge = normalizeDisplayStatus(filters.status);
  if (badge) {
    and.push(displayStatusWhereClause(badge));
  } else {
    and.push({ lifecycleStatus: { code: { in: PUBLIC_LIFECYCLE_CODES } } });
  }

  if (filters.kind) {
    and.push({ resourceType: { code: filters.kind } });
  }
  if (filters.jurisdictionCode) {
    and.push({ primaryJurisdiction: { code: filters.jurisdictionCode } });
  }
  if (filters.providerSlug) {
    and.push({ provider: { slug: filters.providerSlug } });
  }
  if (filters.sovereigntyBasisCode) {
    and.push({
      resourceBases: {
        some: { sovereigntyBasis: { code: filters.sovereigntyBasisCode } }
      }
    });
  }
  if (filters.protocolCode) {
    and.push({ endpoints: { some: { protocol: { code: filters.protocolCode } } } });
  }
  if (filters.languageCode) {
    and.push({
      resourceLanguages: { some: { language: { code: filters.languageCode } } }
    });
  }
  if (filters.q && filters.q.trim() !== "") {
    const q = filters.q.trim();
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
        { airId: { contains: q, mode: "insensitive" } },
        { provider: { displayName: { contains: q, mode: "insensitive" } } },
        { resourceTags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } }
      ]
    });
  }

  return { AND: and };
}

/**
 * Sort: status priority (listed > needs_update > deprecated > suspended)
 * then `updatedAt desc`. The status priority is encoded by `lifecycleStatus.sortOrder`
 * which the seed sets in this order.
 */
const RESOURCE_ORDER_BY: Prisma.ResourceOrderByWithRelationInput[] = [
  { lifecycleStatus: { sortOrder: "asc" } },
  { updatedAt: "desc" },
  { id: "asc" }
];

export async function listPublicResources(
  filters: ListFilters,
  pagination: ListPagination
): Promise<PublicRegistryListResponse> {
  const where = await buildResourceWhere(filters);
  const limit = Math.min(Math.max(pagination.limit, 1), 100);

  const findArgs: Prisma.ResourceFindManyArgs = {
    where,
    include: RESOURCE_INCLUDE,
    orderBy: RESOURCE_ORDER_BY,
    take: limit + 1 // fetch one extra to detect hasMore
  };

  if (pagination.cursor) {
    findArgs.cursor = { id: pagination.cursor };
    findArgs.skip = 1;
  }

  const [rowsRaw, total] = await Promise.all([
    prisma.resource.findMany(findArgs),
    prisma.resource.count({ where })
  ]);

  const hasMore = rowsRaw.length > limit;
  const rows = (hasMore ? rowsRaw.slice(0, limit) : rowsRaw) as ResourceForCard[];
  const cards: RegistryCard[] = rows.map(toRegistryCard);
  const counts: CountsByKind = await countsByKindForFilters(filters);

  return {
    rows: cards,
    total,
    counts,
    page: {
      cursor: hasMore ? rows[rows.length - 1].id : null,
      size: cards.length,
      hasMore
    },
    generatedAt: new Date().toISOString()
  };
}

/** Per-kind totals for the kind tabs - same filters as `filters` except `kind` (search + status + …). */
async function countsByKindForFilters(filters: ListFilters): Promise<CountsByKind> {
  const withoutKind: ListFilters = { ...filters, kind: null };
  const where = await buildResourceWhere(withoutKind);
  const [all, groups] = await Promise.all([
    prisma.resource.count({ where }),
    prisma.resource.groupBy({
      by: ["resourceTypeId"],
      where,
      _count: { _all: true }
    })
  ]);
  const types = await prisma.resourceType.findMany({ select: { id: true, code: true } });
  const codeById = new Map(types.map((t) => [t.id, t.code]));
  const counts: CountsByKind = { all, model: 0, agent: 0, skill: 0, tool: 0 };
  for (const g of groups) {
    const code = codeById.get(g.resourceTypeId);
    if (!code) continue;
    const c = g._count._all;
    if (code === "model") counts.model = c;
    else if (code === "agent") counts.agent = c;
    else if (code === "skill") counts.skill = c;
    else if (code === "tool") counts.tool = c;
  }
  return counts;
}

// ─── Detail query ──────────────────────────────────────────────────────────

export async function findResourceForDetail(args: {
  type?: string;
  slug?: string;
  airId?: string;
  resourceId?: string;
}) {
  if (args.airId) {
    return prisma.resource.findUnique({
      where: { airId: args.airId },
      include: RESOURCE_DETAIL_INCLUDE
    });
  }
  if (args.resourceId) {
    return prisma.resource.findUnique({
      where: { id: args.resourceId },
      include: RESOURCE_DETAIL_INCLUDE
    });
  }
  if (args.slug) {
    // Look up by the (provider, slug) compound - but the public detail route
    // uses `slug` only. Match the first publicly-visible row with this slug.
    return prisma.resource.findFirst({
      where: {
        slug: args.slug,
        ...(args.type ? { resourceType: { code: args.type } } : {}),
        publicVisibility: true,
        lifecycleStatus: { code: { in: PUBLIC_LIFECYCLE_CODES } },
        // Verification gate (see buildResourceWhere): provider must have
        // every applicable verification requirement satisfied.
        provider: { verifications: { none: { verifiedAt: null } } }
      },
      include: RESOURCE_DETAIL_INCLUDE
    });
  }
  return null;
}

// ─── Capability discovery (AIR-SPEC §13) ──────────────────────────────────

/**
 * Find publicly-listable resources whose tags include the given capability.
 *
 * Replaces the raw `prisma.resource.findMany({ ..., resourceTags: { some: ... } })`
 * pattern in `/api/discover` and the MCP `registry.discover` tool. Matching
 * is case-insensitive but exact-token (no fuzzy/substring): caller `mcp`
 * returns rows tagged `mcp`, not `mcp-treasury`.
 *
 * Visibility-rule enforced (constitution §5): only rows with
 * `publicVisibility: true` and a `listed`-class lifecycle code are returned.
 */
export async function findResourcesByCapability(
  capability: string,
  opts: { limit?: number } = {}
): Promise<RegistryCard[]> {
  const tag = capability.trim().toLowerCase();
  if (!tag) return [];
  const take = Math.min(Math.max(opts.limit ?? 100, 1), 200);
  const rows = (await prisma.resource.findMany({
    where: {
      publicVisibility: true,
      lifecycleStatus: { code: { in: PUBLIC_LIFECYCLE_CODES } },
      resourceTags: {
        some: { tag: { name: { equals: tag, mode: "insensitive" } } }
      }
    },
    include: RESOURCE_INCLUDE,
    orderBy: RESOURCE_ORDER_BY,
    take
  })) as ResourceForCard[];
  return rows.map(toRegistryCard);
}

// Re-exports so callers don't need to import from two files.
export { tallyCounts };
