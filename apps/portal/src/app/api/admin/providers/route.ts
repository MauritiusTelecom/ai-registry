import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@airegistry/sdk";
import type { Prisma } from "@/generated/prisma";
import { isSlug, isHttpUrl } from "@airegistry/sdk";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * GET /api/admin/providers - list with q + type + status + jurisdiction filters.
 * POST /api/admin/providers - create operator-added provider.
 *
 * See `ai-registry-specs/shared/admin-crud.md` §5.2.
 */

type ListResponse = {
  rows: Array<{
    id: string;
    slug: string;
    displayName: string;
    typeCode: string;
    typeName: string;
    statusCode: string;
    statusName: string;
    jurisdictionCode: string;
    contactEmail: string;
    websiteUrl: string | null;
    resourceCount: number;
    createdAt: string;
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
  const type = url.searchParams.get("type")?.trim() || "";
  const status = url.searchParams.get("status")?.trim() || "";
  const jurisdiction = url.searchParams.get("jurisdiction")?.trim() || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20)
  );

  const where: Prisma.ProviderWhereInput = {};
  if (q) {
    where.OR = [
      { slug: { contains: q, mode: "insensitive" } },
      { displayName: { contains: q, mode: "insensitive" } },
      { legalName: { contains: q, mode: "insensitive" } },
      { contactEmail: { contains: q, mode: "insensitive" } }
    ];
  }
  if (type) where.type = { code: type };
  if (status) where.status = { code: status };
  if (jurisdiction) where.homeJurisdiction = { code: jurisdiction };

  const [rows, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      include: {
        type: { select: { code: true, name: true } },
        status: { select: { code: true, name: true } },
        homeJurisdiction: { select: { code: true } },
        _count: { select: { resources: true } }
      },
      orderBy: [{ status: { sortOrder: "asc" } }, { displayName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.provider.count({ where })
  ]);

  const body: ListResponse = {
    rows: rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      displayName: p.displayName,
      typeCode: p.type.code,
      typeName: p.type.name,
      statusCode: p.status.code,
      statusName: p.status.name,
      jurisdictionCode: p.homeJurisdiction.code,
      contactEmail: p.contactEmail,
      websiteUrl: p.websiteUrl,
      resourceCount: p._count.resources,
      createdAt: p.createdAt.toISOString()
    })),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total
  };
  return NextResponse.json(body);
}

type CreateBody = {
  slug?: unknown;
  displayName?: unknown;
  typeCode?: unknown;
  jurisdictionCode?: unknown;
  contactEmail?: unknown;
  legalName?: unknown;
  registrationNumber?: unknown;
  websiteUrl?: unknown;
  description?: unknown;
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

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const typeCode =
    typeof body.typeCode === "string" ? body.typeCode.trim().toLowerCase() : "";
  const jurisdictionCode =
    typeof body.jurisdictionCode === "string"
      ? body.jurisdictionCode.trim().toUpperCase()
      : "";
  const contactEmail =
    typeof body.contactEmail === "string" ? body.contactEmail.trim().toLowerCase() : "";
  const legalName =
    typeof body.legalName === "string" && body.legalName.trim() !== ""
      ? body.legalName.trim()
      : null;
  const registrationNumber =
    typeof body.registrationNumber === "string" && body.registrationNumber.trim() !== ""
      ? body.registrationNumber.trim()
      : null;
  const websiteUrl =
    typeof body.websiteUrl === "string" && body.websiteUrl.trim() !== ""
      ? body.websiteUrl.trim()
      : null;
  const description =
    typeof body.description === "string" && body.description.trim() !== ""
      ? body.description.trim()
      : null;

  if (!isSlug(slug)) {
    return NextResponse.json(
      { error: "slug must be lowercase letters, digits, hyphens (2–80 chars)" },
      { status: 400 }
    );
  }
  if (displayName.length < 2) {
    return NextResponse.json({ error: "displayName is required" }, { status: 400 });
  }
  if (!EMAIL_RE.test(contactEmail)) {
    return NextResponse.json({ error: "contactEmail must be valid" }, { status: 400 });
  }
  if (!typeCode) {
    return NextResponse.json({ error: "typeCode is required" }, { status: 400 });
  }
  if (!jurisdictionCode) {
    return NextResponse.json({ error: "jurisdictionCode is required" }, { status: 400 });
  }
  if (websiteUrl && !isHttpUrl(websiteUrl)) {
    return NextResponse.json({ error: "websiteUrl must be http(s)" }, { status: 400 });
  }

  const [type, jurisdiction, statusUnverified, sourceOperator, clash] = await Promise.all([
    prisma.providerTypeRef.findUnique({ where: { code: typeCode } }),
    prisma.jurisdiction.findUnique({ where: { code: jurisdictionCode } }),
    prisma.providerStatusType.findUnique({ where: { code: "unverified" } }),
    prisma.submissionSourceType.findUnique({ where: { code: "operator_added" } }),
    prisma.provider.findUnique({ where: { slug } })
  ]);

  if (!type) return NextResponse.json({ error: "Unknown typeCode" }, { status: 400 });
  if (!jurisdiction)
    return NextResponse.json({ error: "Unknown jurisdictionCode" }, { status: 400 });
  if (!statusUnverified || !sourceOperator) {
    return NextResponse.json({ error: "Reference data not seeded." }, { status: 503 });
  }
  if (clash) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  const created = await prisma.provider.create({
    data: {
      slug,
      displayName,
      typeId: type.id,
      homeJurisdictionId: jurisdiction.id,
      contactEmail,
      legalName,
      registrationNumber,
      websiteUrl,
      description,
      statusId: statusUnverified.id,
      srcId: sourceOperator.id,
      published: true,
      adminSuspended: false
    }
  });

  await writeAudit({
    actorUserId: actor!.id,
    entityType: "provider",
    entityId: created.id,
    action: "provider.created",
    newValue: {
      slug,
      displayName,
      type: typeCode,
      jurisdiction: jurisdictionCode,
      contactEmail
    }
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
