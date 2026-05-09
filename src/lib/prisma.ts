/**
 * Prisma client singleton.
 *
 * Next.js dev mode hot-reloads server modules on every request, which without
 * this pattern would re-instantiate `PrismaClient` per reload and exhaust the
 * Postgres connection pool. The standard fix is to stash the client on
 * `globalThis` outside production builds.
 *
 * Production keeps a fresh per-deploy instance.
 */

import { PrismaClient } from "../generated/prisma";

declare global {
  // eslint-disable-next-line no-var
  var __airegistryPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__airegistryPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__airegistryPrisma = prisma;
}
