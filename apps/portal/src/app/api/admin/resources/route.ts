import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@airegistry/sdk";
import { isSlug } from "@airegistry/sdk";
import type { Prisma } from "@airegistry/sdk/server";
import { getReferenceRow } from "@airegistry/sdk/server";

/**
 * GET /api/admin/resources - list with q + kind + lifecycle + provider filters.
 * POST /api/admin/resources - create operator-added draft. Goes through the
 *   normal review pipeline before listing.
 *
 * See `ai-registry-specs/shared/admin-crud.md` §5.1.
 */

type ListResponse = {
  rows: Array<{
    id: string;
    slug: string;
    title: string;
    airId: string | null;
    kindCode: string;
    lifecycleCode: string;
    lifecycleName: string;
    providerSlug: string;
    providerName: string;
    riskCode: string;
    publicVisibility: boolean;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

function adminGuard(actor: { roles: string[] } | null) {
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  return null;
}

export async function GET(req: Request) {
  const actor = await getCurrentUser();
  const guard = adminGuard(actor);
  if (guard) return guard;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const kind = url.searchParams.get("kind")?.trim() || "";
  const lifecycle = url.searchParams.get("lifecycle")?.trim() || "";
  const provider = url.searchParams.get("provider")?.trim() || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20)
  );

  const where: Prisma.ResourceWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { airId: { contains: q, mode: "insensitive" } }
    ];
  }
  if (kind) where.resourceType = { code: kind };
  if (lifecycle) where.lifecycleStatus = { code: lifecycle };
  if (provider) where.provider = { slug: provider };

  const [rows, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      include: {
        resourceType: { select: { code: true } },
        lifecycleStatus: { select: { code: true, name: true } },
        provider: { select: { slug: true, displayName: true } },
        riskLevel: { select: { code: true } }
      },
      orderBy: [{ lifecycleStatus: { sortOrder: "asc" } }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.resource.count({ where })
  ]);

  const body: ListResponse = {
    rows: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      airId: r.airId,
      kindCode: r.resourceType.code,
      lifecycleCode: r.lifecycleStatus.code,
      lifecycleName: r.lifecycleStatus.name,
      providerSlug: r.provider.slug,
      providerName: r.provider.displayName,
      riskCode: r.riskLevel.code,
      publicVisibility: r.publicVisibility,
      updatedAt: r.updatedAt.toISOString()
    })),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total
  };
  return NextResponse.json(body);
}

type CreateBody = {
  title?: unknown;
  slug?: unknown;
  shortDescription?: unknown;
  resourceTypeCode?: unknown;
  providerSlug?: unknown;
  jurisdictionCode?: unknown;
  riskCode?: unknown;
};

export async function POST(req: Request) {
  const actor = await getCurrentUser();
  const guard = adminGuard(actor);
  if (guard) return guard;

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const shortDescription =
    typeof body.shortDescription === "string" ? body.shortDescription.trim() : "";
  const typeCode =
    typeof body.resourceTypeCode === "string"
      ? body.resourceTypeCode.trim().toLowerCase()
      : "";
  const providerSlug =
    typeof body.providerSlug === "string"
      ? body.providerSlug.trim().toLowerCase()
      : "";
  const jurisdictionCode =
    typeof body.jurisdictionCode === "string"
      ? body.jurisdictionCode.trim().toUpperCase()
      : "";
  const riskCode =
    typeof body.riskCode === "string" && body.riskCode.trim() !== ""
      ? body.riskCode.trim().toLowerCase()
      : "low";

  if (title.length < 2) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!isSlug(slug)) {
    return NextResponse.json({ error: "slug must be lowercase + hyphens" }, { status: 400 });
  }
  if (shortDescription.length < 8) {
    return NextResponse.json(
      { error: "shortDescription must be ≥ 8 chars" },
      { status: 400 }
    );
  }
  if (!typeCode) {
    return NextResponse.json({ error: "resourceTypeCode is required" }, { status: 400 });
  }
  if (!providerSlug) {
    return NextResponse.json({ error: "providerSlug is required" }, { status: 400 });
  }

  const [type, provider, jurisdiction, risk, draft, listingOrigin, clash] = await Promise.all([
    getReferenceRow("resourceType", typeCode),
    prisma.provider.findUnique({
      where: { slug: providerSlug },
      include: { homeJurisdiction: { select: { id: true, code: true } } }
    }),
    jurisdictionCode
      ? getReferenceRow("jurisdiction", jurisdictionCode)
      : Promise.resolve(null),
    getReferenceRow("riskLevel", riskCode),
    getReferenceRow("lifecycleStatus", "draft"),
    getReferenceRow("listingOrigin", "local"),
    prisma.resource.findFirst({
      where: { provider: { slug: providerSlug }, slug }
    })
  ]);

  if (!type) return NextResponse.json({ error: "Unknown resourceTypeCode" }, { status: 400 });
  if (!type.active) {
    return NextResponse.json(
      { error: `Resource type "${typeCode}" is not currently available.` },
      { status: 400 }
    );
  }
  if (!provider) return NextResponse.json({ error: "Unknown providerSlug" }, { status: 400 });
  if (!risk) return NextResponse.json({ error: "Unknown riskCode" }, { status: 400 });
  if (!draft || !listingOrigin) {
    return NextResponse.json({ error: "Reference data not seeded." }, { status: 503 });
  }
  if (clash) {
    return NextResponse.json(
      { error: "Slug already taken for this provider" },
      { status: 409 }
    );
  }

  const primaryJurisdictionId = jurisdiction?.id ?? provider.homeJurisdiction.id;

  const created = await prisma.resource.create({
    data: {
      slug,
      title,
      shortDescription,
      resourceTypeId: type.id,
      providerId: provider.id,
      primaryJurisdictionId,
      listingOriginId: listingOrigin.id,
      lifecycleStatusId: draft.id,
      riskLevelId: risk.id,
      publicVisibility: false,
      airId: null
    }
  });

  await writeAudit({
    actorUserId: actor!.id,
    entityType: "resource",
    entityId: created.id,
    action: "resource.created",
    newValue: {
      slug,
      title,
      kind: typeCode,
      provider: providerSlug,
      risk: riskCode
    }
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
