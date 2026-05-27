import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getReferenceRow,
  updateProviderOrganisation
} from "@airegistry/sdk/server";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";

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
    getReferenceRow("providerTypeRef", providerTypeCode),
    getReferenceRow("jurisdiction", jurisdictionCode),
    getReferenceRow("providerStatusType", "unverified")
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

  const result = await updateProviderOrganisation(user.id, providerId, {
    displayName,
    slug,
    contactEmail,
    legalName,
    description,
    providerTypeId: pType.id,
    jurisdictionId: jurisdiction.id,
    unverifiedStatusId: unverified.id,
    providerTypeCode,
    jurisdictionCode
  });

  if (!result.ok) {
    if (result.code === "provider_not_found") {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "This organisation slug is already taken" },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    provider: result.provider,
    onboardingComplete: true
  });
}
