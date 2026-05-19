/**
 * Merges reference rows that differ only by code casing (e.g. ADMIN vs admin).
 * Keeps the row where code = lower(code), repoints FKs from the other row, then deletes it.
 *
 * Run (preview SQL only):  npx tsx scripts/dedupe-ref-code-casing.ts
 * Run (execute):           npx tsx scripts/dedupe-ref-code-casing.ts --apply
 */
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "../packages/core/src/generated/prisma";

loadDotenv({ path: resolve(process.cwd(), ".env") });

const PARENT_TABLES = [
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

type FkRow = { child_table: string; child_column: string };

async function incomingFks(prisma: PrismaClient, parentTable: string): Promise<FkRow[]> {
  return prisma.$queryRawUnsafe<FkRow[]>(
    `
    SELECT rel_t.relname::text AS child_table, att.attname::text AS child_column
    FROM pg_constraint c
    JOIN pg_class confrel ON confrel.oid = c.confrelid
    JOIN pg_namespace cnsp ON cnsp.oid = confrel.relnamespace
    JOIN pg_class rel_t ON rel_t.oid = c.conrelid
    JOIN pg_namespace tnsp ON tnsp.oid = rel_t.relnamespace
    JOIN LATERAL unnest(c.conkey) AS conkey_attnum(attnum) ON true
    JOIN pg_attribute att ON att.attrelid = c.conrelid AND att.attnum = conkey_attnum.attnum
    WHERE c.contype = 'f'
      AND cnsp.nspname = 'registry'
      AND tnsp.nspname = 'registry'
      AND confrel.relname = $1
    `,
    parentTable
  );
}

function rewireSql(parentTable: string, childTable: string, childColumn: string): string {
  return `
UPDATE registry."${childTable}" AS c
SET "${childColumn}" = k.id
FROM registry."${parentTable}" AS lose
JOIN registry."${parentTable}" AS k
  ON lower(lose.code) = lower(k.code) AND k.code = lower(k.code)
WHERE c."${childColumn}" = lose.id
  AND lose.code <> lower(lose.code)
`.trim();
}

function deleteLosersSql(parentTable: string): string {
  return `
DELETE FROM registry."${parentTable}" AS lose
WHERE lose.code <> lower(lose.code)
  AND EXISTS (
    SELECT 1 FROM registry."${parentTable}" AS k
    WHERE lower(k.code) = lower(lose.code) AND k.code = lower(k.code)
  )
`.trim();
}

async function main() {
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient();
  const statements: string[] = [];

  try {
    for (const parent of PARENT_TABLES) {
      const fks = await incomingFks(prisma, parent);
      for (const fk of fks) {
        statements.push(rewireSql(parent, fk.child_table, fk.child_column));
      }
      statements.push(deleteLosersSql(parent));
    }

    if (!apply) {
      console.log("--apply not passed; printing statements only.\n");
      for (const s of statements) console.log(s + ";\n");
      return;
    }

    await prisma.$transaction(
      async (tx) => {
        for (const s of statements) {
          await tx.$executeRawUnsafe(s);
        }
      },
      { timeout: 120_000 }
    );
    console.log("Dedupe applied successfully.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
