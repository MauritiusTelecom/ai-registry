/**
 * Demo seed: creates a fake Mauritius banking provider with a finance-
 * sector resource, then ensures verification rows for it. The result
 * is a provider that triggers BOTH the mu-brn-check (jurisdiction MU)
 * AND mu-bom-banking-license (banking sector) requirements - perfect
 * for showing the CEO the stacking demo in /admin/verifications.
 *
 *   pnpm tsx scripts/seed-demo-pending-provider.ts
 *
 * Re-run safe. Uses fixed slugs so re-running just resets the rows.
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

const DEMO_PROVIDER_SLUG = "demobank-mauritius-ltd";
const DEMO_RESOURCE_SLUG = "demobank-credit-scoring-agent";

async function main() {
  // Wire the verification source so we know which requirements apply.
  setVerificationManifestSource(() => readAllManifestsSync());

  console.log("Looking up reference rows...");
  const [
    muJurisdiction,
    providerTypes,
    providerStatuses,
    submissionSources,
    resourceTypes,
    lifecycleStatuses,
    riskLevels,
    listingOrigins,
    sectors
  ] = await Promise.all([
    prisma.jurisdiction.findUnique({ where: { code: "MU" } }),
    prisma.providerTypeRef.findMany(),
    prisma.providerStatusType.findMany(),
    prisma.submissionSourceType.findMany(),
    prisma.resourceType.findMany(),
    prisma.lifecycleStatus.findMany(),
    prisma.riskLevel.findMany(),
    prisma.listingOrigin.findMany(),
    prisma.sector.findMany()
  ]);

  if (!muJurisdiction) throw new Error("Jurisdiction 'MU' not found in DB");

  // Available codes vary per deployment — try a few likely options and
  // fall back to the first row of each table if none match.
  function firstOrDefault<T extends { id: string; code: string }>(
    name: string,
    candidates: string[],
    rows: T[]
  ): T {
    for (const c of candidates) {
      const hit = rows.find((r) => r.code === c);
      if (hit) return hit;
    }
    if (rows.length === 0) throw new Error(`${name} is empty in the DB - run db:seed first`);
    console.log(
      `${name}: no exact match for [${candidates.join(", ")}], falling back to first row '${rows[0].code}'`
    );
    return rows[0];
  }

  const providerType = firstOrDefault(
    "ProviderTypeRef",
    ["integrator", "private", "company", "hosting"],
    providerTypes
  );
  const providerStatus = firstOrDefault(
    "ProviderStatusType",
    ["verified", "active", "registered", "listed"],
    providerStatuses
  );
  const submissionSource = firstOrDefault(
    "SubmissionSourceType",
    ["self", "self_registered", "manual", "self_submitted"],
    submissionSources
  );
  const resourceType = firstOrDefault("ResourceType", ["agent", "model", "tool", "skill"], resourceTypes);
  const lifecycleStatus = firstOrDefault(
    "LifecycleStatus",
    ["listed", "submitted", "draft", "needs_update"],
    lifecycleStatuses
  );
  const riskLevel = firstOrDefault(
    "RiskLevel",
    ["moderate", "low", "medium", "limited"],
    riskLevels
  );
  const listingOrigin = firstOrDefault(
    "ListingOrigin",
    ["local", "self_submitted", "direct", "operator_published"],
    listingOrigins
  );
  const financeSector = firstOrDefault(
    "Sector",
    ["finance", "banking", "financial_services", "fintech"],
    sectors
  );

  // ── Upsert the demo provider ────────────────────────────
  const provider = await prisma.provider.upsert({
    where: { slug: DEMO_PROVIDER_SLUG },
    update: {
      displayName: "DemoBank Mauritius Ltd",
      legalName: "DemoBank Mauritius Ltd",
      contactEmail: "compliance@demobank.example.mu",
      description: "Demo provider used to showcase the multi-requirement verification queue.",
      registrationNumber: "C99999999",
      typeId: providerType.id,
      homeJurisdictionId: muJurisdiction.id,
      statusId: providerStatus.id,
      srcId: submissionSource.id
    },
    create: {
      slug: DEMO_PROVIDER_SLUG,
      displayName: "DemoBank Mauritius Ltd",
      legalName: "DemoBank Mauritius Ltd",
      contactEmail: "compliance@demobank.example.mu",
      description: "Demo provider used to showcase the multi-requirement verification queue.",
      registrationNumber: "C99999999",
      typeId: providerType.id,
      homeJurisdictionId: muJurisdiction.id,
      statusId: providerStatus.id,
      srcId: submissionSource.id
    }
  });
  console.log(`Provider: ${provider.displayName} (${provider.id})`);

  // ── Upsert the demo resource in the finance sector ──────
  const resource = await prisma.resource.upsert({
    where: {
      providerId_slug: {
        providerId: provider.id,
        slug: DEMO_RESOURCE_SLUG
      }
    },
    update: {
      title: "DemoBank Credit Scoring Agent",
      shortDescription:
        "Demo AI agent that scores loan applications using local Mauritian credit data.",
      resourceTypeId: resourceType.id,
      primaryJurisdictionId: muJurisdiction.id,
      listingOriginId: listingOrigin.id,
      lifecycleStatusId: lifecycleStatus.id,
      riskLevelId: riskLevel.id
    },
    create: {
      slug: DEMO_RESOURCE_SLUG,
      title: "DemoBank Credit Scoring Agent",
      shortDescription:
        "Demo AI agent that scores loan applications using local Mauritian credit data.",
      providerId: provider.id,
      resourceTypeId: resourceType.id,
      primaryJurisdictionId: muJurisdiction.id,
      listingOriginId: listingOrigin.id,
      lifecycleStatusId: lifecycleStatus.id,
      riskLevelId: riskLevel.id
    }
  });
  console.log(`Resource: ${resource.title} (${resource.id})`);

  // Link the resource to the finance sector so the BoM extension's
  // sector-gated requirement applies.
  await prisma.resourceSector.upsert({
    where: {
      resourceId_sectorId: { resourceId: resource.id, sectorId: financeSector.id }
    },
    update: {},
    create: { resourceId: resource.id, sectorId: financeSector.id }
  });
  console.log(`Linked resource to sector: ${financeSector.code}`);

  // ── Clean any pre-existing verification rows so the demo
  //    always starts with both requirements pending ─────────
  await prisma.providerVerification.deleteMany({
    where: { providerId: provider.id }
  });

  // ── Sync applicable requirement rows (both pending) ────
  await ensureVerificationRowsForProvider(provider.id);
  const rows = await prisma.providerVerification.findMany({
    where: { providerId: provider.id },
    orderBy: { extensionId: "asc" }
  });

  console.log("\n=== Pending requirements created ===");
  for (const r of rows) {
    console.log(`  ${r.extensionId} :: ${r.requirementCode} -> ${r.label}`);
  }
  console.log("\nOpen the admin queue to demo:");
  console.log("  https://airegistry.myt.mu/admin/verifications");
  console.log("  https://www.airegistry.mu/admin/verifications");
  console.log(`\nPublic profile (currently HIDDEN until verified):`);
  console.log(`  https://www.airegistry.mu/providers/${provider.slug}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
