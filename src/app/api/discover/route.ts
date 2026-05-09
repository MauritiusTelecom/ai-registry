import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toRegistryCard, type ResourceForCard } from "@/lib/discovery/serializers";
import type { Problem } from "@/lib/discovery/types";

/**
 * GET /api/discover?capability=<tag>
 *
 * AIR-SPEC §13 capability discovery. Returns all publicly-listable resources
 * whose `tags` (Tag.name) include the requested capability. Capability
 * matching is case-insensitive but exact-token (no fuzzy / substring): the
 * caller asked for `mcp`, we return rows tagged `mcp`, not `mcp-treasury`.
 *
 * The response shape mirrors the list endpoint so callers can swap routes
 * without rewriting their consumer.
 */

const PUBLIC_LIFECYCLE_CODES = ["listed", "deprecated", "needs_update"];

export async function GET(req: Request) {
  const capability = new URL(req.url).searchParams.get("capability");
  if (!capability || capability.trim() === "") {
    const problem: Problem = {
      type: "https://airegistry.spec/problem/missing-capability",
      title: "Missing capability parameter",
      status: 400,
      detail: "Provide a capability tag via the `capability` query parameter."
    };
    return NextResponse.json(problem, { status: 400 });
  }

  const tag = capability.trim().toLowerCase();
  const rows = (await prisma.resource.findMany({
    where: {
      publicVisibility: true,
      lifecycleStatus: { code: { in: PUBLIC_LIFECYCLE_CODES } },
      resourceTags: { some: { tag: { name: { equals: tag, mode: "insensitive" } } } }
    },
    include: {
      resourceType: true,
      provider: true,
      primaryJurisdiction: true,
      lifecycleStatus: true,
      riskLevel: true,
      resourceTags: { include: { tag: true } },
      trustSignals: { include: { kind: true, status: true } },
      endpoints: { include: { protocol: true } }
    },
    orderBy: [
      { lifecycleStatus: { sortOrder: "asc" } },
      { updatedAt: "desc" }
    ],
    take: 100
  })) as ResourceForCard[];

  return NextResponse.json(
    {
      capability: tag,
      rows: rows.map(toRegistryCard),
      total: rows.length,
      generatedAt: new Date().toISOString()
    },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" }
    }
  );
}
