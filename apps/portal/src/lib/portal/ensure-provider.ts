/**
 * Links a self-registered provider user to a Provider row on first authoring
 * action (Phase 4). Registration does not create Provider; this keeps a single
 * creation path with slug collision handling.
 */

import { prisma } from "@/lib/prisma";
import { getConfig } from "@airegistry/sdk";

function slugifyLocalPart(email: string): string {
  const local = email.split("@")[0] ?? "provider";
  const s = local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s.length >= 2 ? s : "provider";
}

async function uniqueProviderSlug(base: string): Promise<string> {
  let candidate = base;
  let n = 0;
  for (;;) {
    const clash = await prisma.provider.findUnique({ where: { slug: candidate } });
    if (!clash) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

/**
 * Ensures `userId` (provider role) has `providerId` set; creates Provider + link if missing.
 * Returns the provider id.
 */
export async function ensureUserProviderLinked(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  });
  if (!user) throw new Error("User not found");
  if (user.role.code !== "provider") {
    throw new Error("Only provider-role users can be linked to a provider organisation");
  }
  if (user.providerId) return user.providerId;

  const cfg = getConfig();
  const [jurisdiction, type, status, src] = await Promise.all([
    prisma.jurisdiction.findUnique({ where: { code: cfg.jurisdiction } }),
    prisma.providerTypeRef.findUnique({ where: { code: "integrator" } }),
    prisma.providerStatusType.findUnique({ where: { code: "unverified" } }),
    prisma.submissionSourceType.findUnique({ where: { code: "self_submitted" } })
  ]);
  if (!jurisdiction || !type || !status || !src) {
    throw new Error("Reference data not seeded (run npm run db:seed).");
  }

  const displayName = user.organisationName?.trim() || user.name || user.email;
  const baseSlug = slugifyLocalPart(user.email);
  const slug = await uniqueProviderSlug(baseSlug);

  const provider = await prisma.$transaction(async (tx) => {
    const p = await tx.provider.create({
      data: {
        slug,
        displayName,
        legalName: displayName,
        typeId: type.id,
        homeJurisdictionId: jurisdiction.id,
        contactEmail: user.email,
        statusId: status.id,
        srcId: src.id,
        published: false,
        description: `Self-registered provider workspace for ${user.email}.`
      }
    });
    await tx.user.update({
      where: { id: userId },
      data: { providerId: p.id }
    });
    return p;
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      entityType: "provider",
      entityId: provider.id,
      action: "provider.workspace_created",
      newValue: { slug: provider.slug, displayName: provider.displayName }
    }
  });

  return provider.id;
}
