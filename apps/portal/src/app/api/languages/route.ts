import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/languages - BCP-47 codes the deployment supports. */
export async function GET() {
  const rows = await prisma.language.findMany({
    where: { active: true },
    select: { code: true, name: true },
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
