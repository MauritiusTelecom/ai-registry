import { NextResponse } from "next/server";
import { findResourcesByCapability } from "@airegistry/sdk";
import type { Problem } from "@airegistry/sdk";

/**
 * GET /api/discover?capability=<tag>
 *
 * AIR-SPEC §13 capability discovery. Returns all publicly-listable resources
 * whose `tags` (Tag.name) include the requested capability. Capability
 * matching is case-insensitive but exact-token (no fuzzy / substring): the
 * caller asked for `mcp`, we return rows tagged `mcp`, not `mcp-treasury`.
 *
 * The response shape mirrors the list endpoint so callers can swap routes
 * without rewriting their consumer. Visibility-rule enforcement
 * (constitution §5) is centralised in `findResourcesByCapability`.
 */

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
  const rows = await findResourcesByCapability(tag);

  return NextResponse.json(
    {
      capability: tag,
      rows,
      total: rows.length,
      generatedAt: new Date().toISOString()
    },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" }
    }
  );
}
