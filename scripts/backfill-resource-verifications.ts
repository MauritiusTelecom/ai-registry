/**
 * One-shot: for every existing Resource, ensure ResourceVerification rows
 * exist for the resource-level requirements declared by loaded extensions.
 * Existing rows are left alone. Then grandfather any still-pending row on a
 * currently-LISTED resource as verified, so resources that were already public
 * don't disappear from the catalogue when the resource-level gate ships.
 *
 *   pnpm tsx scripts/backfill-resource-verifications.ts
 *
 * Idempotent. Safe to re-run on every deploy. Mirrors
 * scripts/backfill-verifications.ts (the provider-level equivalent).
 *
 * Why a script: `prisma db push` only syncs schema and does NOT run migration
 * SQL, so this backfill must run via the Prisma client on db-push servers.
 */

import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(__dirname, "../.env") });

import { prisma } from "@airegistry/core";
import {
  ensureResourceVerificationRows,
  setResourceRequirementManifestSource
} from "@airegistry/core/services/resource-verification";
import { readAllManifestsSync } from "@airegistry/plugin-host/discover";

async function main() {
  const manifests = readAllManifestsSync();
  setResourceRequirementManifestSource(() => manifests);
  console.log(`Loaded ${manifests.length} extension manifest(s).`);
  for (const m of manifests) {
    const reqs = m.resourceRequirements?.length ?? 0;
    if (reqs > 0) console.log(`  ${m.id}: ${reqs} resource requirement(s)`);
  }

  const adminRole = await prisma.userRoleType.findUnique({ where: { code: "admin" } });
  const admin = adminRole
    ? await prisma.user.findFirst({
        where: { roleId: adminRole.id },
        orderBy: { createdAt: "asc" }
      })
    : null;
  if (admin) console.log(`Using fallback admin: ${admin.email}`);

  const resources = await prisma.resource.findMany({ select: { id: true } });
  console.log(`Found ${resources.length} resource(s) to sync.`);

  let touched = 0;
  for (const r of resources) {
    await ensureResourceVerificationRows(r.id);
    touched++;
  }
  console.log(`Synced resource verification rows for ${touched} resource(s).`);

  // Grandfather: only pending rows on already-LISTED resources, so existing
  // public resources stay public. Draft/submitted resources are left to go
  // through real verification.
  if (admin) {
    const listed = await prisma.lifecycleStatus.findUnique({ where: { code: "listed" } });
    if (listed) {
      const grandfathered = await prisma.resourceVerification.updateMany({
        where: {
          verifiedAt: null,
          rejectionNote: null,
          resource: { lifecycleStatusId: listed.id }
        },
        data: { verifiedAt: new Date(), verifiedById: admin.id }
      });
      console.log(`Grandfathered ${grandfathered.count} pending row(s) on listed resources.`);
    }
  } else {
    console.log("No admin user found; skipping grandfather step.");
  }

  const total = await prisma.resourceVerification.count();
  const verified = await prisma.resourceVerification.count({
    where: { verifiedAt: { not: null } }
  });
  console.log(`Done. total=${total} verified=${verified}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("Backfill failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
