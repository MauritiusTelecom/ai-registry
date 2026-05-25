/**
 * Cleanup job for orphaned review-thread attachment directories on disk.
 *
 * Walks <THREAD_ATTACHMENT_ROOT>/threads/, for each <threadId> directory
 * checks whether a ReviewThread with that id still exists. If not, removes
 * the directory.
 *
 * Run nightly via cron:
 *
 *   0 3 * * *  cd /data/ai-registry-v2 && pnpm tsx scripts/cleanup-orphaned-attachments.ts >> /var/log/airegistry/cleanup.log 2>&1
 *
 * Safe to run while the app is serving — only directories with no DB row
 * are touched.
 */

import { readdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: resolve(__dirname, "../.env") });

import { prisma } from "@airegistry/core";

async function main() {
  const root = process.env.THREAD_ATTACHMENT_ROOT
    ? resolve(process.env.THREAD_ATTACHMENT_ROOT)
    : resolve(__dirname, "..", "storage");

  const threadsDir = join(root, "threads");

  let entries: string[];
  try {
    entries = await readdir(threadsDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.log(`No threads dir at ${threadsDir} — nothing to clean.`);
      return;
    }
    throw err;
  }

  let kept = 0;
  let removed = 0;
  let skipped = 0;

  for (const threadId of entries) {
    const abs = join(threadsDir, threadId);
    try {
      const st = await stat(abs);
      if (!st.isDirectory()) {
        skipped++;
        continue;
      }
    } catch {
      skipped++;
      continue;
    }

    const exists = await prisma.reviewThread.findUnique({
      where: { id: threadId },
      select: { id: true }
    });

    if (exists) {
      kept++;
      continue;
    }

    try {
      await rm(abs, { recursive: true, force: true });
      console.log(`✗ removed orphan ${threadId}`);
      removed++;
    } catch (err) {
      console.warn(`! failed to remove ${threadId}:`, err);
      skipped++;
    }
  }

  console.log(`Cleanup done. kept=${kept} removed=${removed} skipped=${skipped}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("Cleanup failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
