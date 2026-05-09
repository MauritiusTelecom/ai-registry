import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { writeAudit } from "@/lib/audit/write-audit";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * GET /api/portal/resources?lifecycle=draft
 * POST /api/portal/resources — create draft resource (provider workspace).
 */

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json(
      { error: "Use provider account to list workspace resources." },
      { status: 403 }
    );
  }

  const providerId = await ensureUserProviderLinked(user.id);

  const url = new URL(req.url);
  const lifecycleCode = url.searchParams.get("lifecycle")?.trim() || null;

  const resources = await prisma.resource.findMany({
    where: {
      providerId,
      ...(lifecycleCode
        ? { lifecycleStatus: { code: lifecycleCode } }
        : {})
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      resourceType: { select: { code: true, name: true } },
      lifecycleStatus: { select: { code: true, name: true } }
    }
  });

  const byStatus = new Map<string, typeof resources>();
  for (const r of resources) {
    const code = r.lifecycleStatus.code;
    if (!byStatus.has(code)) byStatus.set(code, []);
    byStatus.get(code)!.push(r);
  }

  return NextResponse.json({
    resources: resources.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      shortDescription: r.shortDescription,
      type: r.resourceType.code,
      lifecycle: r.lifecycleStatus.code,
      lifecycleName: r.lifecycleStatus.name,
      airId: r.airId,
      updatedAt: r.updatedAt.toISOString()
    })),
    countsByLifecycle: Object.fromEntries(
      [...byStatus.entries()].map(([k, v]) => [k, v.length])
    )
  });
}

type CreateBody = {
  resourceTypeCode?: unknown;
  slug?: unknown;
  title?: unknown;
  shortDescription?: unknown;
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const typeCode =
    typeof body.resourceTypeCode === "string" ? body.resourceTypeCode.trim().toLowerCase() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const shortDescription =
    typeof body.shortDescription === "string" ? body.shortDescription.trim() : "";

  const cfg = getConfig();
  if (!(cfg.resourceTypes as string[]).includes(typeCode)) {
    return NextResponse.json(
      { error: `resourceTypeCode must be one of: ${cfg.resourceTypes.join(", ")}` },
      { status: 400 }
    );
  }
  if (!SLUG_RE.test(slug) || slug.length < 2 || slug.length > 120) {
    return NextResponse.json(
      { error: "slug must be lowercase letters, digits, hyphens only (2–120 chars)" },
      { status: 400 }
    );
  }
  if (title.length < 2) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (shortDescription.length < 8) {
    return NextResponse.json(
      { error: "shortDescription must be at least 8 characters" },
      { status: 400 }
    );
  }

  const providerId = await ensureUserProviderLinked(user.id);

  const existingSlug = await prisma.resource.findUnique({
    where: { providerId_slug: { providerId, slug } }
  });
  if (existingSlug) {
    return NextResponse.json({ error: "slug already used for this provider" }, { status: 409 });
  }

  const [draft, listingLocal, riskLow, rType, basis, protocolRest, authApiKey, accessRegistered, healthUnknown] =
    await Promise.all([
      prisma.lifecycleStatus.findUnique({ where: { code: "draft" } }),
      prisma.listingOrigin.findUnique({ where: { code: "local" } }),
      prisma.riskLevel.findUnique({ where: { code: "low" } }),
      prisma.resourceType.findUnique({ where: { code: typeCode } }),
      prisma.sovereigntyBasis.findUnique({ where: { code: "local_law" } }),
      prisma.protocol.findUnique({ where: { code: "rest" } }),
      prisma.authMethodType.findUnique({ where: { code: "api_key" } }),
      prisma.accessModelType.findUnique({ where: { code: "registered" } }),
      prisma.endpointHealthType.findUnique({ where: { code: "unknown" } })
    ]);

  if (!draft || !listingLocal || !riskLow || !rType || !basis || !protocolRest || !authApiKey || !accessRegistered || !healthUnknown) {
    return NextResponse.json({ error: "Reference data not seeded." }, { status: 503 });
  }

  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
    select: { slug: true, homeJurisdictionId: true }
  });

  const resource = await prisma.$transaction(async (tx) => {
    const res = await tx.resource.create({
      data: {
        slug,
        title,
        shortDescription,
        resourceTypeId: rType.id,
        providerId,
        primaryJurisdictionId: provider.homeJurisdictionId,
        listingOriginId: listingLocal.id,
        lifecycleStatusId: draft.id,
        riskLevelId: riskLow.id,
        publicVisibility: false,
        airId: null
      }
    });

    await tx.resourceSovereigntyBasis.create({
      data: {
        resourceId: res.id,
        sovereigntyBasisId: basis.id,
        submittedById: user.id
      }
    });

    await tx.resourceEndpoint.create({
      data: {
        resourceId: res.id,
        protocolId: protocolRest.id,
        endpointUrl: `https://${provider.slug}.example/api/${slug}`,
        authMethodId: authApiKey.id,
        accessModelId: accessRegistered.id,
        primary: true,
        active: true,
        lastCheckStatusId: healthUnknown.id
      }
    });

    return res;
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "resource",
    entityId: resource.id,
    action: "resource.draft_created",
    newValue: { slug, title, type: typeCode }
  });

  return NextResponse.json(
    {
      ok: true,
      resource: {
        id: resource.id,
        slug: resource.slug,
        title: resource.title,
        type: typeCode,
        lifecycle: "draft"
      }
    },
    { status: 201 }
  );
}
