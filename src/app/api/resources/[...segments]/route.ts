import { NextResponse } from "next/server";
import { findResourceForDetail } from "@/lib/discovery/queries";
import { toRegistryCardDetail } from "@/lib/discovery/serializers";
import type { Problem } from "@/lib/discovery/types";

/**
 * GET /api/resources/[slug] and GET /api/resources/[type]/[slug]
 *
 * Next.js does not allow sibling dynamic folders `[slug]` and `[type]` under
 * the same parent. This single catch-all preserves both URL shapes:
 *   - one segment → slug-only detail (same behaviour as former `[slug]` route)
 *   - two segments → type + slug when first segment is model|agent|tool|skill
 */

const KINDS = new Set(["model", "agent", "tool", "skill"]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ segments: string[] }> }
) {
  const segments = (await params).segments;
  if (!segments?.length) {
    const problem: Problem = {
      type: "https://airegistry.spec/problem/resource-not-found",
      title: "Resource not found",
      status: 404,
      detail: "Missing resource path."
    };
    return NextResponse.json(problem, {
      status: 404,
      headers: { "content-type": "application/problem+json" }
    });
  }

  if (segments.length > 2) {
    const problem: Problem = {
      type: "https://airegistry.spec/problem/resource-not-found",
      title: "Resource not found",
      status: 404,
      detail: "Too many path segments."
    };
    return NextResponse.json(problem, {
      status: 404,
      headers: { "content-type": "application/problem+json" }
    });
  }

  let row: Awaited<ReturnType<typeof findResourceForDetail>> = null;
  let slugFor410 = "";
  let detail404 = "";

  if (segments.length === 1) {
    const slug = decodeURIComponent(segments[0]!);
    slugFor410 = slug;
    detail404 = `No publicly-listable resource with slug "${slug}".`;
    row = await findResourceForDetail({ slug });
  } else {
    const type = decodeURIComponent(segments[0]!);
    const slug = decodeURIComponent(segments[1]!);
    slugFor410 = slug;
    if (!KINDS.has(type)) {
      const problem: Problem = {
        type: "https://airegistry.spec/problem/unknown-resource-type",
        title: "Unknown resource type",
        status: 400,
        detail: `Resource type "${type}" is not one of model | agent | tool | skill.`
      };
      return NextResponse.json(problem, {
        status: 400,
        headers: { "content-type": "application/problem+json" }
      });
    }
    detail404 = `No publicly-listable ${type} with slug "${slug}".`;
    row = await findResourceForDetail({ type, slug });
  }

  if (!row) {
    const problem: Problem = {
      type: "https://airegistry.spec/problem/resource-not-found",
      title: "Resource not found",
      status: 404,
      detail: detail404
    };
    return NextResponse.json(problem, {
      status: 404,
      headers: { "content-type": "application/problem+json" }
    });
  }

  if (row.lifecycleStatus.code === "removed") {
    const problem: Problem = {
      type: "https://airegistry.spec/problem/resource-removed",
      title: "Resource removed",
      status: 410,
      detail: `Resource "${slugFor410}" was removed from this registry.`
    };
    return NextResponse.json(problem, {
      status: 410,
      headers: { "content-type": "application/problem+json" }
    });
  }

  return NextResponse.json(toRegistryCardDetail(row), {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
      "Content-Language": row.primaryJurisdiction.code === "MU" ? "en" : "en"
    }
  });
}
