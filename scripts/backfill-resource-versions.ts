/**
 * One-shot backfill: for every Resource that has no currentPublishedVersionId,
 * create a v1 ResourceVersion (status=approved) snapshotting the current
 * scalar fields, and point currentPublishedVersionId at it.
 *
 * Safe to re-run (idempotent — skips resources that already have v1).
 *
 * Usage on the server:
 *   cd /data/ai-registry-v2
 *   pnpm tsx scripts/backfill-resource-versions.ts
 */

import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(__dirname, "../.env") });

import { prisma } from "@airegistry/core";

async function main() {
  const approvedStatus = await prisma.resourceVersionStatusType.findUnique({
    where: { code: "approved" }
  });
  if (!approvedStatus) {
    throw new Error(
      "ResourceVersionStatusType 'approved' not found - did the schema push run?"
    );
  }

  // Pick a fallback user (admin preferred, otherwise any user)
  const adminRole = await prisma.userRoleType.findUnique({ where: { code: "admin" } });
  let fallbackUser = adminRole
    ? await prisma.user.findFirst({
        where: { roleId: adminRole.id },
        orderBy: { createdAt: "asc" }
      })
    : null;
  if (!fallbackUser) {
    fallbackUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  }
  if (!fallbackUser) {
    console.log("No users in the DB; nothing to backfill (fresh install).");
    return;
  }
  console.log(`Using fallback user: ${fallbackUser.email} (${fallbackUser.id})`);

  const resources = await prisma.resource.findMany({
    where: { currentPublishedVersionId: null },
    select: {
      id: true,
      title: true,
      shortDescription: true,
      longDescription: true,
      accessUrl: true,
      sourceCodeUrl: true,
      documentationUrl: true,
      termsUrl: true,
      license: true,
      versionLabel: true,
      versionNumber: true,
      latencyTier: true,
      riskLevelId: true,
      createdAt: true,
      listedAt: true
    }
  });

  console.log(`Found ${resources.length} resources without a v1.`);

  let done = 0;
  for (const r of resources) {
    await prisma.$transaction(async (tx) => {
      const v1 = await tx.resourceVersion.create({
        data: {
          resourceId: r.id,
          versionNumber: 1,
          statusId: approvedStatus.id,
          title: r.title,
          shortDescription: r.shortDescription,
          longDescription: r.longDescription,
          accessUrl: r.accessUrl,
          sourceCodeUrl: r.sourceCodeUrl,
          documentationUrl: r.documentationUrl,
          termsUrl: r.termsUrl,
          license: r.license,
          versionLabel: r.versionLabel,
          providerVersionNumber: r.versionNumber,
          latencyTier: r.latencyTier,
          riskLevelId: r.riskLevelId,
          createdById: fallbackUser.id,
          createdAt: r.listedAt ?? r.createdAt,
          approvedById: fallbackUser.id,
          approvedAt: r.listedAt ?? r.createdAt
        }
      });
      await tx.resource.update({
        where: { id: r.id },
        data: { currentPublishedVersionId: v1.id }
      });
    });
    done++;
    if (done % 10 === 0) console.log(`  ${done}/${resources.length}`);
  }

  console.log(`✓ Backfilled v1 for ${done} resources.`);

  const counts = await prisma.$transaction([
    prisma.resource.count(),
    prisma.resource.count({ where: { currentPublishedVersionId: { not: null } } })
  ]);
  console.log(`Resource total = ${counts[0]}, with v1 = ${counts[1]}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("Backfill failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
