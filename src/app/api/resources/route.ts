import { NextResponse } from "next/server";
import { listPublicResources } from "@/lib/discovery/queries";
import type { ResourceKind } from "@/lib/discovery/types";

/**
 * GET /api/resources
 *
 * Public registry list (AIR-SPEC §13). Supports query parameters:
 *
 *   q                      free-text search across title/desc/airId/provider/tags
 *   kind                   model | agent | tool | skill
 *   jurisdiction           jurisdiction code (e.g. MU)
 *   provider               provider slug
 *   sovereignty_basis      sovereignty basis code (e.g. local_law)
 *   protocol               endpoint protocol code (e.g. rest, mcp)
 *   language               BCP-47 language code (e.g. en, fr, mfe)
 *   status                 display badge filter: verified | trusted | active | experimental | isolated
 *   limit                  page size 1..100, default 20
 *   cursor                 resource id of last row from previous page
 *
 * Response: PublicRegistryListResponse with rows, total, counts (per kind),
 * page envelope, and generatedAt. Cache is short — public visitors should
 * see status changes within a minute or two.
 *
 * Rate-limit headers are placeholders (T022); a real limiter ships in Phase 5.
 */

const KINDS: ResourceKind[] = ["model", "agent", "tool", "skill"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const limitRaw = parseInt(params.get("limit") ?? "20", 10);
  const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));
  const status = params.get("status");
  const data = await listPublicResources(
    {
      q: params.get("q"),
      kind: pickKind(params.get("kind")),
      status: status && status.trim() !== "" ? status.trim() : null,
      jurisdictionCode: params.get("jurisdiction"),
      providerSlug: params.get("provider"),
      sovereigntyBasisCode: params.get("sovereignty_basis"),
      protocolCode: params.get("protocol"),
      languageCode: params.get("language")
    },
    {
      limit,
      cursor: params.get("cursor")
    }
  );

  return NextResponse.json(data, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "X-RateLimit-Limit": "60",
      "X-RateLimit-Remaining": "60"
    }
  });
}

function pickKind(value: string | null): ResourceKind | null {
  if (!value) return null;
  return KINDS.includes(value as ResourceKind) ? (value as ResourceKind) : null;
}
