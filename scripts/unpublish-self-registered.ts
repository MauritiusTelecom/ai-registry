#!/usr/bin/env tsx
/**
 * One-shot: unpublish all self-registered + unverified providers so they no
 * longer appear on the public providers page. New self-registrations are
 * created with published=false; this catches pre-existing rows.
 */

import { prisma } from "@/lib/prisma";

async function main() {
  const result = await prisma.provider.updateMany({
    where: {
      published: true,
      src: { code: "self_submitted" },
      status: { code: "unverified" }
    },
    data: { published: false }
  });
  console.log(`Unpublished ${result.count} self-registered provider(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
