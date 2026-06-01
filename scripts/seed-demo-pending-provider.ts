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

async function refByCode<T extends { id: string; code: string }>(
  table: string,
  candidates: string[],
  rows: T[]
): Promise<T> {
  for (const c of candidates) {
    const hit = rows.find((r) => r.code === c);
    if (hit) return hit;
  }
  throw new Error(
    `No matching row in ${table}. Looked for codes: ${candidates.join(
      ", "
    )}. Available: ${rows.map((r) => r.code).join(", ")}`
  );
}

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

  const providerType = await refByCode("ProviderTypeRef", ["private", "public_agency", "company"], providerTypes);
  const providerStatus = await refByCode(
    "ProviderStatusType",
    ["verified", "active", "registered"],
    providerStatuses
  );
  const submissionSource = await refByCode(
    "SubmissionSourceType",
    ["self", "self_registered", "manual"],
    submissionSources
  );
  const resourceType = await refByCode("ResourceType", ["agent", "model", "tool"], resourceTypes);
  const lifecycleStatus = await refByCode(
    "LifecycleStatus",
    ["listed", "submitted", "draft"],
    lifecycleStatuses
  );
  const riskLevel = await refByCode("RiskLevel", ["moderate", "low", "medium"], riskLevels);
  const listingOrigin = await refByCode(
    "ListingOrigin",
    ["local", "self_submitted", "direct"],
    listingOrigins
  );
  const financeSector = await refByCode("Sector", ["finance", "banking", "financial_services"], sectors);

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
