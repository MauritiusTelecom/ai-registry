/**
 * One-shot seeder for the lookup tables added by recent migrations.
 *
 * Needed because `prisma db push` (what deploy:db runs) only syncs the
 * schema and does NOT execute the INSERT statements in our migration
 * SQL files. The lookup tables therefore stay empty on servers that
 * use db push.
 *
 * Idempotent (upsert by code). Safe to re-run on every deploy.
 *
 * Usage:
 *   cd /data/ai-registry-v2
 *   pnpm tsx scripts/seed-lookups.ts
 */

import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(__dirname, "../.env") });

import { prisma } from "@airegistry/core";

const REVIEW_THREAD_STATUSES = [
  { code: "open",               name: "Open",               description: "Thread is open; awaiting first response",       sortOrder: 10 },
  { code: "awaiting_provider",  name: "Awaiting provider",  description: "Verifier is waiting for provider response",     sortOrder: 20 },
  { code: "awaiting_verifier",  name: "Awaiting verifier",  description: "Provider has replied; verifier action pending", sortOrder: 30 },
  { code: "resolved",           name: "Resolved",           description: "Both parties agree the issue is closed",        sortOrder: 40 },
  { code: "closed",             name: "Closed",             description: "Closed without resolution",                     sortOrder: 50 }
];

const PROVIDER_DOC_TYPES = [
  { code: "company_registration", name: "Company registration certificate", description: "BRN / incorporation document",      sortOrder: 10 },
  { code: "authorised_signatory", name: "Authorised signatory proof",       description: "Letter / mandate from the company", sortOrder: 20 },
  { code: "compliance_iso27001",  name: "ISO 27001 certification",          description: "Information security management",   sortOrder: 30 },
  { code: "compliance_soc2",      name: "SOC 2 attestation",                description: "Service Organization Control 2",    sortOrder: 40 },
  { code: "tax_standing",         name: "Tax / regulatory standing",        description: "Tax clearance or equivalent",       sortOrder: 50 },
  { code: "other",                name: "Other supporting document",        description: "Anything not covered above",        sortOrder: 90 }
];

const RESOURCE_VERSION_STATUSES = [
  { code: "draft",     name: "Draft",     description: "Provider is editing",                  sortOrder: 10 },
  { code: "submitted", name: "Submitted", description: "Awaiting verifier review",             sortOrder: 20 },
  { code: "approved",  name: "Approved",  description: "Was or is the live published version", sortOrder: 30 },
  { code: "rejected",  name: "Rejected",  description: "Verifier did not approve",             sortOrder: 40 }
];

async function main() {
  console.log("Seeding ReviewThreadStatusType...");
  for (const s of REVIEW_THREAD_STATUSES) {
    await prisma.reviewThreadStatusType.upsert({
      where: { code: s.code },
      update: {},
      create: s
    });
  }
  console.log("Seeding ProviderDocumentType...");
  for (const t of PROVIDER_DOC_TYPES) {
    await prisma.providerDocumentType.upsert({
      where: { code: t.code },
      update: {},
      create: t
    });
  }
  console.log("Seeding ResourceVersionStatusType...");
  for (const s of RESOURCE_VERSION_STATUSES) {
    await prisma.resourceVersionStatusType.upsert({
      where: { code: s.code },
      update: {},
      create: s
    });
  }

  const [a, b, c] = await Promise.all([
    prisma.reviewThreadStatusType.count(),
    prisma.providerDocumentType.count(),
    prisma.resourceVersionStatusType.count()
  ]);
  console.log(
    `Done. ReviewThreadStatusType=${a} ProviderDocumentType=${b} ResourceVersionStatusType=${c}`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("Seeding failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
