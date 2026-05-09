/**
 * Public provider browse — Prisma queries for GET /api/providers.
 */

import type { Prisma } from "../../generated/prisma";
import { prisma } from "../prisma";
import {
  providerStatusCodesForBadgeFilter,
  toPublicProviderCard,
  type ProviderForCard
} from "./serializers";
import type {
  CountsByProviderKind,
  DisplayStatus,
  PublicProvidersListResponse,
  PublicProviderCard
} from "./types";

export type ProviderListFilters = {
  q: string | null;
  /** Tab filter: sovereign | model | hosting | integrator (research rolls into model). */
  kind: string | null;
  status: string | null;
};

export type ProviderListPagination = {
  limit: number;
  cursor: string | null;
};

const PROVIDER_ORDER_BY: Prisma.ProviderOrderByWithRelationInput[] = [
  { status: { sortOrder: "asc" } },
  { displayName: "asc" },
  { id: "asc" }
];

const PROVIDER_INCLUDE = {
  homeJurisdiction: true,
  type: { select: { code: true, name: true } },
  status: { select: { code: true, name: true } },
  _count: { select: { resources: true } }
} satisfies Prisma.ProviderInclude;

function normalizeDisplayStatus(raw: string | null): DisplayStatus | null {
  if (!raw || raw.trim() === "") return null;
  const s = raw.trim().toLowerCase();
  const allowed: DisplayStatus[] = ["verified", "trusted", "active", "experimental", "isolated"];
  return allowed.includes(s as DisplayStatus) ? (s as DisplayStatus) : null;
}

export async function buildProviderWhere(filters: ProviderListFilters): Promise<Prisma.ProviderWhereInput> {
  const and: Prisma.ProviderWhereInput[] = [{ published: true, adminSuspended: false }];

  const badge = normalizeDisplayStatus(filters.status);
  if (badge) {
    const codes = providerStatusCodesForBadgeFilter(badge);
    if (codes.length === 0) {
      and.push({ id: { in: [] } });
    } else {
      and.push({ status: { code: { in: codes } } });
    }
  }

  if (filters.kind) {
    if (filters.kind === "model") {
      and.push({ type: { code: { in: ["model", "research"] } } });
    } else {
      and.push({ type: { code: filters.kind } });
    }
  }

  if (filters.q && filters.q.trim() !== "") {
    const q = filters.q.trim();
    and.push({
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { homeJurisdiction: { code: { contains: q, mode: "insensitive" } } }
      ]
    });
  }

  return { AND: and };
}

async function countsByProviderKindForFilters(
  filters: Omit<ProviderListFilters, "kind">
): Promise<CountsByProviderKind> {
  const where = await buildProviderWhere({ ...filters, kind: null });
  const [all, groups] = await Promise.all([
    prisma.provider.count({ where }),
    prisma.provider.groupBy({
      by: ["typeId"],
      where,
      _count: { _all: true }
    })
  ]);
  const types = await prisma.providerTypeRef.findMany({ select: { id: true, code: true } });
  const codeById = new Map(types.map((t) => [t.id, t.code]));
  const counts: CountsByProviderKind = { all, sovereign: 0, model: 0, hosting: 0, integrator: 0 };
  for (const g of groups) {
    const code = codeById.get(g.typeId);
    if (!code) continue;
    const c = g._count._all;
    if (code === "sovereign") counts.sovereign += c;
    else if (code === "model" || code === "research") counts.model += c;
    else if (code === "hosting") counts.hosting += c;
    else if (code === "integrator") counts.integrator += c;
  }
  return counts;
}

export async function listPublicProviders(
  filters: ProviderListFilters,
  pagination: ProviderListPagination
): Promise<PublicProvidersListResponse> {
  const where = await buildProviderWhere(filters);
  const limit = Math.min(Math.max(pagination.limit, 1), 100);

  const findArgs: Prisma.ProviderFindManyArgs = {
    where,
    include: PROVIDER_INCLUDE,
    orderBy: PROVIDER_ORDER_BY,
    take: limit + 1
  };

  if (pagination.cursor) {
    findArgs.cursor = { id: pagination.cursor };
    findArgs.skip = 1;
  }

  const [rowsRaw, total] = await Promise.all([
    prisma.provider.findMany(findArgs),
    prisma.provider.count({ where })
  ]);

  const hasMore = rowsRaw.length > limit;
  const rows = (hasMore ? rowsRaw.slice(0, limit) : rowsRaw) as ProviderForCard[];
  const cards: PublicProviderCard[] = rows.map(toPublicProviderCard);
  const counts = await countsByProviderKindForFilters({
    q: filters.q,
    status: filters.status
  });

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
