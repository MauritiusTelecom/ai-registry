import { NextResponse } from "next/server";
import { findResourceForDetail } from "@/lib/discovery/queries";
import { toRegistryCardDetail } from "@/lib/discovery/serializers";
import type { Problem } from "@/lib/discovery/types";

/**
 * GET /api/resolve?identity=air://<domain>/<type>/<provider>/<slug>
 *
 * AIR-SPEC §13 normative resolve. Maps an `air://` URI to the registry's
 * public-safe record. The semantics are:
 *
 *   - 200 + RegistryCardDetail            - found and publicly listable
 *   - 404                                  - never existed under this AIR-ID
 *   - 410                                  - once existed, now removed
 *
 * The body of a 410 includes the last known title/provider so consumers can
 * surface a deprecation message without a second lookup.
 */

const AIR_PATTERN = /^air:\/\/([^/]+)\/([^/]+)\/([^/]+)\/([^/?#]+)(?:[#?].*)?$/;

export async function GET(req: Request) {
  const identity = new URL(req.url).searchParams.get("identity");
  if (!identity) {
    const problem: Problem = {
      type: "https://airegistry.spec/problem/missing-identity",
      title: "Missing identity parameter",
      status: 400,
      detail: "Provide an air:// URI via the `identity` query parameter."
    };
    return NextResponse.json(problem, { status: 400 });
  }

  if (!AIR_PATTERN.test(identity)) {
    const problem: Problem = {
      type: "https://airegistry.spec/problem/malformed-air-id",
      title: "Malformed AIR-ID",
      status: 400,
      detail: `Expected air://<domain>/<type>/<provider>/<slug>; got "${identity}".`
    };
    return NextResponse.json(problem, { status: 400 });
  }

  const row = await findResourceForDetail({ airId: identity });
  if (!row) {
    const problem: Problem = {
      type: "https://airegistry.spec/problem/air-id-not-found",
      title: "AIR-ID not found",
      status: 404
    };
    return NextResponse.json(problem, { status: 404 });
  }

  if (row.lifecycleStatus.code === "removed") {
    return NextResponse.json(
      {
        type: "https://airegistry.spec/problem/resource-removed",
        title: "Resource removed",
        status: 410,
        airId: row.airId,
        title_was: row.title,
        provider_was: row.provider.displayName
      },
      { status: 410, headers: { "content-type": "application/problem+json" } }
    );
  }

  return NextResponse.json(toRegistryCardDetail(row), {
    status: 200,
    headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" }
  });
}
