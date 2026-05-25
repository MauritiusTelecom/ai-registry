/**
 * Reference-table catalog service.
 *
 * Every controlled vocabulary in the schema (~28 tables: resource types,
 * lifecycle statuses, jurisdictions, sovereignty bases, languages, sectors,
 * protocols, etc.) shares the same shape — id, code, name, description,
 * sortOrder, active — and the same access pattern (list, lookup-by-code,
 * count). This module collapses ~160 raw `prisma.<refTable>.findMany/...`
 * calls in apps/portal into a single typed surface.
 *
 * Exposed through `@airegistry/sdk/server` (PR 13A). Apps and extensions
 * MUST NOT reach into `prisma.<refTable>.*` directly for reference reads;
 * use these helpers.
 *
 * Constitution alignment:
 *   - §1 (registry-points discipline): centralising catalog reads keeps the
 *     public surface stable even as the schema evolves underneath.
 *   - §5 (visibility rule): reference rows have an `active` flag; the
 *     default `listReferenceTable(...)` call returns active rows only.
 *     Admin/audit surfaces opt into `{ activeOnly: false }`.
 */

import { prisma } from "../prisma";

/**
 * The Prisma model name of every reference table AIR-Core knows about.
 *
 * Adding a new reference table:
 *   1. add the Prisma model with the standard reference shape
 *      (id, code, name, description, sortOrder, active);
 *   2. add the model name here;
 *   3. (admin CRUD only) extend REF_TABLES in admin/reference-tables.ts.
 *
 * The tuple is `as const` so the union type is precise.
 */
export const REFERENCE_TABLE_NAMES = [
  "resourceType",
  "lifecycleStatus",
  "riskLevel",
  "listingOrigin",
  "trustSignalType",
  "trustSignalStatusType",
  "reviewType",
  "reviewStatusType",
  "checklistResultType",
  "userRoleType",
  "userStatusType",
  "providerTypeRef",
  "providerStatusType",
  "submissionSourceType",
  "protocol",
  "accessModelType",
  "authMethodType",
  "endpointHealthType",
  "sovereigntyBasis",
  "evidenceType",
  "jurisdiction",
  "sector",
  "language",
  "complaintType",
  "complaintSeverityType",
  "complaintStatusType",
  "enforcementType",
  "officialAuthorityType",
  "officialAuthorisationStatusType",
  "providerDocumentType",
  "reviewThreadStatusType",
  "resourceVersionStatusType"
] as const;

export type ReferenceTableName = (typeof REFERENCE_TABLE_NAMES)[number];

/**
 * The public projection every reference row shares. Service callers receive
 * this shape regardless of which table they queried — no Prisma row types
 * leak across the boundary.
 */
export type ReferenceRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
};

export type ListReferenceOptions = {
  /**
   * When `true` (default), only rows with `active = true` are returned.
   * Set to `false` only on admin surfaces that need to render archived rows.
   */
  activeOnly?: boolean;
  /** Default `"sortOrder"` (the schema's canonical display order). */
  orderBy?: "sortOrder" | "name" | "code";
  /**
   * Optional whitelist of codes to include. Useful when the deployment
   * config restricts which reference values are valid (e.g. allowed
   * resource types per RegistryConfig.resourceTypes).
   */
  codes?: readonly string[];
};

/**
 * Minimal Prisma model surface this service relies on. We dispatch by name
 * (`(prisma as any)[table]`) because Prisma generates 28 separate model
 * accessors that all share this contract. Type-level enforcement happens at
 * the `ReferenceTableName` union; at runtime we verify the model exists.
 */
type ReferenceModel = {
  findMany(args?: { where?: unknown; orderBy?: unknown }): Promise<unknown[]>;
  findUnique(args: { where: unknown }): Promise<unknown | null>;
  findFirst(args?: { where?: unknown; orderBy?: unknown }): Promise<unknown | null>;
  count(args?: { where?: unknown }): Promise<number>;
};

function modelFor(table: ReferenceTableName): ReferenceModel {
  const m = (prisma as unknown as Record<string, ReferenceModel | undefined>)[table];
  if (!m || typeof m.findMany !== "function") {
    throw new Error(
      `Unknown reference table: "${table}". ` +
      `Known: ${REFERENCE_TABLE_NAMES.join(", ")}.`
    );
  }
  return m;
}

function normalize(row: unknown): ReferenceRow {
  const r = row as Record<string, unknown>;
  return {
    id: String(r.id),
    code: String(r.code),
    name: String(r.name),
    description: typeof r.description === "string" ? r.description : null,
    sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : 0,
    active: r.active !== false
  };
}

/**
 * List the rows of a reference table. Active-only by default; pass
 * `{ activeOnly: false }` to see archived rows too (admin surfaces only).
 *
 * Replaces patterns like:
 *
 *   prisma.resourceType.findMany({ orderBy: { sortOrder: "asc" } })
 *   prisma.lifecycleStatus.findMany({ where: { active: true } })
 */
export async function listReferenceTable(
  table: ReferenceTableName,
  opts: ListReferenceOptions = {}
): Promise<ReferenceRow[]> {
  const model = modelFor(table);
  const whereParts: Record<string, unknown> = {};
  if (opts.activeOnly !== false) whereParts.active = true;
  if (opts.codes && opts.codes.length > 0) whereParts.code = { in: [...opts.codes] };
  const where = Object.keys(whereParts).length > 0 ? whereParts : undefined;
  const orderBy =
    opts.orderBy === "name"
      ? { name: "asc" as const }
      : opts.orderBy === "code"
      ? { code: "asc" as const }
      : { sortOrder: "asc" as const };
  const rows = await model.findMany({ where, orderBy });
  return rows.map(normalize);
}

/**
 * Look up a single reference row by its `code` (preferred) or `id`. Returns
 * `null` when not found. Tries `code` first because every AIR-SPEC reference
 * uses the code as the stable identifier (e.g., `"verified"`, `"draft"`).
 *
 * Replaces patterns like:
 *
 *   prisma.userStatusType.findUnique({ where: { code: "active" } })
 *   prisma.lifecycleStatus.findUnique({ where: { id } })
 */
export async function getReferenceRow(
  table: ReferenceTableName,
  codeOrId: string
): Promise<ReferenceRow | null> {
  const model = modelFor(table);
  const byCode = await model.findUnique({ where: { code: codeOrId } });
  if (byCode) return normalize(byCode);
  const byId = await model.findUnique({ where: { id: codeOrId } });
  return byId ? normalize(byId) : null;
}

/**
 * Count rows in a reference table. Active-only by default.
 *
 * Replaces patterns like:
 *
 *   prisma.resourceType.count()
 *   prisma.providerTypeRef.count({ where: { active: true } })
 */
export async function countReferenceTable(
  table: ReferenceTableName,
  opts: { activeOnly?: boolean } = {}
): Promise<number> {
  const model = modelFor(table);
  const where = opts.activeOnly === false ? undefined : { active: true };
  return model.count({ where });
}

/**
 * Bulk lookup by code. Returns the matching rows in the order they appear
 * in `codes`; missing codes are silently dropped (callers verifying input
 * should diff their input against the returned codes).
 *
 * Replaces patterns like:
 *
 *   prisma.sovereigntyBasis.findMany({ where: { code: { in: basisCodes } } })
 *
 * No `activeOnly` filter by default — callers validating user-supplied
 * codes typically need to find archived rows too, to give a precise error.
 */
export async function findReferenceRowsByCodes(
  table: ReferenceTableName,
  codes: readonly string[]
): Promise<ReferenceRow[]> {
  if (codes.length === 0) return [];
  const model = modelFor(table);
  const rows = await model.findMany({ where: { code: { in: codes } } });
  const normalized = rows.map(normalize);
  // Preserve the caller's order so `basisCodes.map(c => result.find(r => r.code === c))`
  // patterns don't need re-sorting at the call site.
  const byCode = new Map(normalized.map((r) => [r.code, r] as const));
  return codes.map((c) => byCode.get(c)).filter((r): r is ReferenceRow => r != null);
}
