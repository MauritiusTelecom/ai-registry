/**
 * One-shot: grandfather every existing Provider as BRN-verified.
 *
 * Why: the public visibility gate added by the mu-brn-check extension
 * hides MU providers (and their resources) until brnVerifiedAt is set.
 * Without this backfill, every existing provider would vanish from the
 * public catalog on deploy.
 *
 * Safe to re-run (idempotent — skips providers that already have
 * brnVerifiedAt).
 *
 *   pnpm tsx scripts/backfill-brn-grandfather.ts
 */

import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(__dirname, "../.env") });

import { prisma } from "@airegistry/core";

async function main() {
  // Pick a fallback admin to mark as the "verifier" of grandfathered rows.
  const adminRole = await prisma.userRoleType.findUnique({ where: { code: "admin" } });
  const admin = adminRole
    ? await prisma.user.findFirst({
        where: { roleId: adminRole.id },
        orderBy: { createdAt: "asc" }
      })
    : null;

  const pending = await prisma.provider.findMany({
    where: { brnVerifiedAt: null },
    select: { id: true, createdAt: true }
  });

  console.log(`Found ${pending.length} providers to grandfather.`);

  for (const p of pending) {
    await prisma.provider.update({
      where: { id: p.id },
      data: {
        brnVerifiedAt: p.createdAt,
        brnVerifiedById: admin?.id ?? null,
        brnVerificationNote: "Grandfathered at migration time."
      }
    });
  }

  const total = await prisma.provider.count();
  const verified = await prisma.provider.count({ where: { brnVerifiedAt: { not: null } } });
  console.log(`Done. total=${total} verified=${verified}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("Backfill failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
