import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/jurisdictions
 *
 * Public read-only listing of the active jurisdictions seeded into this
 * deployment. Integrators populate filter UIs from this endpoint - see the
 * Phase 1 seed for the canonical entries.
 */
export async function GET() {
  const rows = await prisma.jurisdiction.findMany({
    where: { active: true },
    select: {
      code: true,
      name: true,
      type: { select: { code: true, name: true } },
      parent: { select: { code: true, name: true } }
    },
    orderBy: [{ type: { sortOrder: "asc" } }, { code: "asc" }]
  });
  return NextResponse.json(
    { rows, total: rows.length, generatedAt: new Date().toISOString() },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1800" }
    }
  );
}
