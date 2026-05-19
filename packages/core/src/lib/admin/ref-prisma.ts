/**
 * Runtime adapter - resolves a reference-table config to its Prisma model
 * proxy. Pure string lookup; the `RefTableConfig.modelKey` is the source of
 * truth.
 *
 * The cast to `Record<string, ModelLike>` is the deliberate type-erasure
 * point. Every operation we invoke (`findMany`, `count`, `findUnique`,
 * `create`, `update`, `delete`) exists on every reference-table model
 * because they share a stable shape (`id` PK, controlled fields, no
 * relations beyond the join tables).
 */

import { Prisma } from "../../generated/prisma";
import { prisma } from "../prisma";
import type { RefTableConfig } from "./reference-tables";

type ModelLike = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  count: (args?: unknown) => Promise<number>;
  findUnique: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
};

export function modelFor(config: RefTableConfig): ModelLike {
  const proxy = (prisma as unknown as Record<string, ModelLike>)[config.modelKey];
  if (!proxy || typeof proxy.findMany !== "function") {
    throw new Error(
      `Reference table "${config.id}" has invalid modelKey "${config.modelKey}".`
    );
  }
  return proxy;
}

export const PrismaErrorCode = {
  /** Foreign-key constraint failed - typically thrown on DELETE when rows reference this one. */
  FK_CONSTRAINT: "P2003",
  /** Unique constraint failed - `code` collisions on create / update. */
  UNIQUE_VIOLATION: "P2002",
  /** Record not found. */
  NOT_FOUND: "P2025"
} as const;

export function isPrismaKnownError(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError;
}
