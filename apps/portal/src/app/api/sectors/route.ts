import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/sectors - public read-only sector taxonomy. */
export async function GET() {
  const rows = await prisma.sector.findMany({
    where: { active: true },
    select: { code: true, name: true, description: true },
    orderBy: { code: "asc" }
  });
  return NextResponse.json(
    { rows, total: rows.length, generatedAt: new Date().toISOString() },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1800" }
    }
  );
}
