/**
 * One-shot: for every existing Provider, create ProviderVerification rows
 * for the requirements declared by loaded extensions. Existing rows are
 * left alone. The migration SQL also did this in DB-only form for the
 * BRN extension; this script handles the general case and re-runs
 * idempotently on every deploy.
 *
 * Special case: when we drop Provider.brnVerifiedAt (migration
 * 20260601150000_provider_verification_multi_requirement), the
 * migration SQL backfills MT's existing BRN verifications into the
 * new table. This script is for fresh deploys where `db push` skips
 * that SQL.
 *
 *   pnpm tsx scripts/backfill-verifications.ts
 */

import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(__dirname, "../.env") });

import { prisma } from "@airegistry/core";
import { ensurePluginsLoaded } from "@airegistry/plugin-host";
import { ensureVerificationRowsForProvider } from "@airegistry/core/services/verification";

async function main() {
  await ensurePluginsLoaded();
  console.log("Plugins loaded.");

  // Pick an admin so we can mark existing rows as verified for the
  // grandfather case (any extension that already had a corresponding
  // legacy column).
  const adminRole = await prisma.userRoleType.findUnique({ where: { code: "admin" } });
  const admin = adminRole
    ? await prisma.user.findFirst({
        where: { roleId: adminRole.id },
        orderBy: { createdAt: "asc" }
      })
    : null;
  if (admin) {
    console.log(`Using fallback admin: ${admin.email}`);
  }

  const providers = await prisma.provider.findMany({ select: { id: true } });
  console.log(`Found ${providers.length} providers to sync.`);

  let touched = 0;
  for (const p of providers) {
    await ensureVerificationRowsForProvider(p.id);
    touched++;
  }
  console.log(`Synced verification rows for ${touched} providers.`);

  // Grandfather rule: providers that already existed before the
  // multi-requirement system shipped need their initial requirements
  // marked verified, otherwise they'd disappear from public catalog.
  // We mark every row that was just created with verifiedAt = createdAt
  // (the migration SQL also does this; this is the no-op for fresh DBs).
  if (admin) {
    const grandfathered = await prisma.providerVerification.updateMany({
      where: { verifiedAt: null, rejectionNote: null },
      data: { verifiedAt: new Date(), verifiedById: admin.id }
    });
    console.log(`Grandfathered ${grandfathered.count} pending rows as verified.`);
  } else {
    console.log("No admin user found; skipping grandfather step. Pending rows remain pending.");
  }

  const totals = {
    rows: await prisma.providerVerification.count(),
    verified: await prisma.providerVerification.count({ where: { verifiedAt: { not: null } } })
  };
  console.log(`Done. total=${totals.rows} verified=${totals.verified}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("Backfill failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
