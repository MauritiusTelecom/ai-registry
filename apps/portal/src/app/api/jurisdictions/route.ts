import { NextResponse } from "next/server";
import { loadPublicJurisdictionsList } from "@airegistry/sdk/server";

/**
 * GET /api/jurisdictions
 *
 * Public read-only listing of the active jurisdictions seeded into this
 * deployment. Integrators populate filter UIs from this endpoint - see the
 * Phase 1 seed for the canonical entries. Nested type + parent joins are
 * preserved in the service so the public JSON shape stays stable.
 */
export async function GET() {
  const rows = await loadPublicJurisdictionsList();
  return NextResponse.json(
    { rows, total: rows.length, generatedAt: new Date().toISOString() },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1800" }
    }
  );
}
