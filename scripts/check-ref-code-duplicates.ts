/**
 * Lists rows whose `code` collides case-insensitively within the same table.
 * Run: npx tsx scripts/check-ref-code-duplicates.ts
 */
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma";

loadDotenv({ path: resolve(process.cwd(), ".env") });

/** Prisma model names → PostgreSQL "Table" names in schema `registry`. */
const CODE_TABLES = [
  "UserRoleType",
  "UserStatusType",
  "ProviderTypeRef",
  "ProviderStatusType",
  "ResourceType",
  "LifecycleStatus",
  "RiskLevel",
  "ListingOrigin",
  "EvidenceType",
  "JurisdictionType",
  "TrustSignalType",
  "TrustSignalStatusType",
  "ReviewType",
  "ReviewStatusType",
  "ChecklistResultType",
  "Protocol",
  "AccessModelType",
  "AuthMethodType",
  "EndpointHealthType",
  "OfficialAuthorityType",
  "OfficialAuthorisationStatusType",
  "ComplaintType",
  "ComplaintSeverityType",
  "ComplaintStatusType",
  "EnforcementType",
  "SubmissionSourceType",
  "Sector",
  "Language",
  "SovereigntyBasis"
] as const;

async function main() {
  const prisma = new PrismaClient();
  try {
    let anyDup = false;
    for (const table of CODE_TABLES) {
      const sql = `SELECT lower(code) AS lc, array_agg(code ORDER BY code) AS codes, count(*)::int AS n FROM registry."${table}" GROUP BY lower(code) HAVING count(*) > 1`;
      const rows = await prisma.$queryRawUnsafe<{ lc: string; codes: string[]; n: number }[]>(sql);
      if (rows.length) {
        anyDup = true;
        console.log(`\n${table} — case-insensitive duplicate groups:`);
        for (const r of rows) console.log(`  lower=${r.lc}  codes=${JSON.stringify(r.codes)}  count=${r.n}`);
      }
    }
    const jurSql = `SELECT lower(code) AS lc, array_agg(code ORDER BY code) AS codes, count(*)::int AS n FROM registry."Jurisdiction" GROUP BY lower(code) HAVING count(*) > 1`;
    const jur = await prisma.$queryRawUnsafe<{ lc: string; codes: string[]; n: number }[]>(jurSql);
    if (jur.length) {
      anyDup = true;
      console.log(`\nJurisdiction — case-insensitive duplicate groups:`);
      for (const r of jur) console.log(`  lower=${r.lc}  codes=${JSON.stringify(r.codes)}  count=${r.n}`);
    }
    if (!anyDup) {
      console.log("No case-insensitive duplicate `code` values found in reference + sector/language/basis/jurisdiction tables.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
