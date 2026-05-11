import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/protocols - endpoint protocol vocabulary (REST/MCP/A2A/gRPC). */
export async function GET() {
  const rows = await prisma.protocol.findMany({
    where: { active: true },
    select: { code: true, name: true, description: true },
    orderBy: { sortOrder: "asc" }
  });
  return NextResponse.json(
    { rows, total: rows.length, generatedAt: new Date().toISOString() },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1800" }
    }
  );
}
