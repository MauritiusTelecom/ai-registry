/**
 * One-shot: for every existing Provider, ensure ProviderVerification
 * rows exist for the requirements declared by loaded extensions.
 * Existing rows are left alone. Then grandfather any still-pending row
 * as verified so existing providers don't disappear from the public
 * catalog on the first deploy.
 *
 *   pnpm tsx scripts/backfill-verifications.ts
 *
 * Idempotent. Safe to re-run on every deploy.
 *
 * Why a script: `prisma db push` only syncs schema and does NOT execute
 * migration SQL, so the backfill / grandfather logic baked into the
 * migration file is missed on servers that use db push. This script
 * does the same work via the Prisma client.
 */

import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(__dirname, "../.env") });

import { prisma } from "@airegistry/core";
import {
  ensureVerificationRowsForProvider,
  setVerificationManifestSource
} from "@airegistry/core/services/verification";
import { readAllManifestsSync } from "@airegistry/plugin-host/discover";

async function main() {
  // Wire the manifest source. Outside the Next.js runtime so we don't
  // call ensurePluginsLoaded() (which uses `server-only`); just read
  // the manifests synchronously.
  const manifests = readAllManifestsSync();
  setVerificationManifestSource(() => manifests);
  console.log(`Loaded ${manifests.length} extension manifest(s).`);
  for (const m of manifests) {
    const reqs = m.verificationRequirements?.length ?? 0;
    if (reqs > 0) console.log(`  ${m.id}: ${reqs} requirement(s)`);
  }

  // Pick an admin so we can mark existing rows as grandfathered.
  const adminRole = await prisma.userRoleType.findUnique({ where: { code: "admin" } });
  const admin = adminRole
    ? await prisma.user.findFirst({
        where: { roleId: adminRole.id },
        orderBy: { createdAt: "asc" }
      })
    : null;
  if (admin) console.log(`Using fallback admin: ${admin.email}`);

  const providers = await prisma.provider.findMany({ select: { id: true } });
  console.log(`Found ${providers.length} provider(s) to sync.`);

  let touched = 0;
  for (const p of providers) {
    await ensureVerificationRowsForProvider(p.id);
    touched++;
  }
  console.log(`Synced verification rows for ${touched} provider(s).`);

  // Grandfather: any row that's currently pending (no verifiedAt, no
  // rejectionNote) gets marked verified so existing providers stay
  // public after the gate ships. Only fires for rows that have never
  // been touched.
  if (admin) {
    const grandfathered = await prisma.providerVerification.updateMany({
      where: { verifiedAt: null, rejectionNote: null },
      data: { verifiedAt: new Date(), verifiedById: admin.id }
    });
    console.log(`Grandfathered ${grandfathered.count} pending row(s) as verified.`);
  } else {
    console.log("No admin user found; skipping grandfather step.");
  }

  const total = await prisma.providerVerification.count();
  const verified = await prisma.providerVerification.count({
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
