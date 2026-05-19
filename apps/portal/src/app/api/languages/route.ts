import { NextResponse } from "next/server";
import { listReferenceTable } from "@airegistry/sdk/server";

/** GET /api/languages - BCP-47 codes the deployment supports. */
export async function GET() {
  const all = await listReferenceTable("language", { orderBy: "code" });
  // Preserve the public JSON shape: only { code, name } per AIR-SPEC. The
  // service returns the full ReferenceRow; we project here so the public
  // API contract doesn't drift.
  const rows = all.map((r) => ({ code: r.code, name: r.name }));
  return NextResponse.json(
    { rows, total: rows.length, generatedAt: new Date().toISOString() },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1800" }
    }
  );
}
