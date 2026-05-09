import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPublicProviderCard, type ProviderForCard } from "@/lib/discovery/serializers";

/**
 * GET /api/providers
 *
 * Public providers listing — backs the /providers page (T021 mirror) and
 * lets integrators populate provider filter UIs. Status maps via
 * ProviderStatusType.code to the public display badge.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);

  const where: Parameters<typeof prisma.provider.findMany>[0] = {
    where: {
      published: true,
      adminSuspended: false,
      ...(kind ? { type: { code: kind } } : {})
    }
  };

  const rows = (await prisma.provider.findMany({
    ...where,
    include: {
      homeJurisdiction: true,
      type: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      _count: { select: { resources: true } }
    },
    orderBy: [{ status: { sortOrder: "asc" } }, { displayName: "asc" }],
    take: limit
  })) as unknown as ProviderForCard[];

  const cards = rows.map(toPublicProviderCard);
  return NextResponse.json(
    {
      rows: cards,
      total: cards.length,
      generatedAt: new Date().toISOString()
    },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=900" }
    }
  );
}
