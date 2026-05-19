import { NextResponse } from "next/server";
import { getConfig } from "@airegistry/sdk";
import { countReferenceTable } from "@airegistry/sdk/server";

/**
 * GET /api/health
 *
 * Phase 5 / T051. Liveness + DB-readiness probe used by load balancers, CI,
 * and the smoke script. Returns:
 *
 *   200 { status: "ok",  db: "ok",   resourceTypes: number, generatedAt }
 *   503 { status: "fail", db: "down", error?: string }
 *
 * Cache headers are explicit no-store; this endpoint must always reflect the
 * current process and database state.
 */

export async function GET() {
  const startedAt = Date.now();
  let db: "ok" | "down" = "down";
  let resourceTypes = 0;
  let error: string | undefined;

  try {
    // Cheap round-trip - counts the resource_type reference table which the
    // seed always populates. If the schema is missing the count call throws
    // and we surface a 503.
    resourceTypes = await countReferenceTable("resourceType", { activeOnly: false });
    db = "ok";
  } catch (e) {
    db = "down";
    error = e instanceof Error ? e.message : "database unavailable";
  }

  const cfg = (() => {
    try {
      return getConfig();
    } catch {
      return null;
    }
  })();

  const body = {
    status: db === "ok" ? "ok" : "fail",
    db,
    resourceTypes,
    registry: cfg
      ? {
          name: cfg.registryName,
          identityDomain: cfg.identityDomain,
          jurisdiction: cfg.jurisdiction
        }
      : null,
    durationMs: Date.now() - startedAt,
    generatedAt: new Date().toISOString(),
    ...(error ? { error } : {})
  };

  return NextResponse.json(body, {
    status: db === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" }
  });
}
