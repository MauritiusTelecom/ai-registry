import { NextResponse } from "next/server";
import { listReferenceTable } from "@airegistry/sdk/server";

/** GET /api/sectors - public read-only sector taxonomy. */
export async function GET() {
  const all = await listReferenceTable("sector", { orderBy: "code" });
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
