import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { writeAudit } from "@airegistry/sdk";
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

type Body = {
  displayName?: unknown;
  slug?: unknown;
  contactEmail?: unknown;
  providerTypeCode?: unknown;
  jurisdictionCode?: unknown;
  legalName?: unknown;
  description?: unknown;
};

/**
 * PATCH /api/portal/provider/organisation
 *
 * Updates linked Provider org profile and sets User.onboardingComplete when valid.
 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const contactEmail =
    typeof body.contactEmail === "string" ? body.contactEmail.trim().toLowerCase() : "";
  const providerTypeCode =
    typeof body.providerTypeCode === "string" ? body.providerTypeCode.trim().toLowerCase() : "";
  const jurisdictionCode =
    typeof body.jurisdictionCode === "string" ? body.jurisdictionCode.trim().toUpperCase() : "";
  const legalName =
    typeof body.legalName === "string" && body.legalName.trim() !== ""
      ? body.legalName.trim()
      : null;
  const description =
    typeof body.description === "string" && body.description.trim() !== ""
      ? body.description.trim()
      : null;

  if (displayName.length < 2) {
    return NextResponse.json({ error: "displayName is required (min 2 characters)" }, { status: 400 });
  }
  if (!SLUG_RE.test(slug) || slug.length < 2 || slug.length > 80) {
    return NextResponse.json(
      { error: "slug must be lowercase letters, digits, hyphens only (2–80 chars)" },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(contactEmail)) {
    return NextResponse.json({ error: "contactEmail must be a valid email" }, { status: 400 });
  }
  if (!providerTypeCode) {
    return NextResponse.json({ error: "providerTypeCode is required" }, { status: 400 });
  }
  if (!jurisdictionCode) {
    return NextResponse.json({ error: "jurisdictionCode is required" }, { status: 400 });
  }

  const providerId = await ensureUserProviderLinked(user.id);

  const [pType, jurisdiction, unverified] = await Promise.all([
    prisma.providerTypeRef.findUnique({ where: { code: providerTypeCode } }),
    prisma.jurisdiction.findUnique({ where: { code: jurisdictionCode } }),
    prisma.providerStatusType.findUnique({ where: { code: "unverified" } })
  ]);
  if (!pType) {
    return NextResponse.json({ error: "Unknown providerTypeCode" }, { status: 400 });
  }
  if (!jurisdiction) {
    return NextResponse.json({ error: "Unknown jurisdictionCode" }, { status: 400 });
  }
  if (!unverified) {
    return NextResponse.json({ error: "Reference data not seeded." }, { status: 503 });
  }

  const existing = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { slug: true }
  });
  if (!existing) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  if (slug !== existing.slug) {
    const clash = await prisma.provider.findUnique({ where: { slug } });
    if (clash) {
      return NextResponse.json({ error: "This organisation slug is already taken" }, { status: 409 });
    }
  }

  const prev = await prisma.provider.findUnique({
    where: { id: providerId },
    select: {
      slug: true,
      displayName: true,
      contactEmail: true,
      homeJurisdictionId: true,
      typeId: true
    }
  });

  await prisma.$transaction([
    prisma.provider.update({
      where: { id: providerId },
      data: {
        slug,
        displayName,
        contactEmail,
        legalName,
        description,
        typeId: pType.id,
        homeJurisdictionId: jurisdiction.id,
        statusId: unverified.id
      }
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { onboardingComplete: true }
    })
  ]);

  const updated = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
    select: {
      id: true,
      slug: true,
      displayName: true,
      contactEmail: true
    }
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "provider",
    entityId: providerId,
    action: "provider.organisation_profile_completed",
    previousValue: prev,
    newValue: {
      slug,
      displayName,
      contactEmail,
      providerTypeCode,
      jurisdictionCode,
      onboardingComplete: true
    }
  });

  return NextResponse.json({
    ok: true,
    provider: {
      id: updated.id,
      slug: updated.slug,
      displayName: updated.displayName,
      contactEmail: updated.contactEmail
    },
    onboardingComplete: true
  });
}
