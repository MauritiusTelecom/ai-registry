import { NextResponse } from "next/server";
import { listReferenceTable } from "@airegistry/sdk/server";

/** GET /api/sovereignty-bases - AIR-SPEC §7 sovereignty basis vocabulary. */
export async function GET() {
  const all = await listReferenceTable("sovereigntyBasis", { orderBy: "code" });
  const rows = all.map((r) => ({
    code: r.code,
    name: r.name,
    description: r.description
  }));
  return NextResponse.json(
    { rows, total: rows.length, generatedAt: new Date().toISOString() },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1800" }
    }
  );
}
