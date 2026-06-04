/**
 * Multi-requirement resource verification — the resource-level analog of
 * services/verification.ts.
 *
 * Each extension declares resourceRequirements in its plugin manifest. At
 * runtime this module:
 *   1. Reads the applicability matrix from loaded plugin manifests.
 *   2. For any resource, computes which requirements apply (by the resource's
 *      provider jurisdiction, the resource's own sectors, and its kind).
 *   3. Stores per-(resource, extension, code) status rows in ResourceVerification.
 *   4. Exposes verify / reject / listPending / isFullyVerified helpers used by
 *      the admin queue, the provider resource view, and the public visibility
 *      gate (a resource is listed only once every applicable requirement is
 *      verified).
 *
 * Extensions write nothing to ResourceVerification directly; the admin UI does,
 * via the generic API (or an extension may auto-verify its own rows).
 */

import type { SessionUser } from "../auth/current-user";
import { prisma } from "../prisma";

// Structurally mirrored from @airegistry/sdk/plugin to avoid a circular dep;
// plugin-host supplies a compatible value at boot.
export type PluginResourceApplicability = {
  providerJurisdiction?: string[];
  resourceSectors?: string[];
  resourceKinds?: string[];
};

export type PluginResourceRequirement = {
  code: string;
  label: string;
  appliesWhen?: PluginResourceApplicability;
  documentTypeHint?: string;
};

export type PluginManifestForResourceVerification = {
  id: string;
  resourceRequirements?: PluginResourceRequirement[];
};

// ─── Manifest source (host-supplied) ───────────────────────

type ManifestSource = () => readonly PluginManifestForResourceVerification[];

let manifestSource: ManifestSource = () => [];

export function setResourceRequirementManifestSource(source: ManifestSource): void {
  manifestSource = source;
}

export function listAllResourceRequirements(): Array<{
  extensionId: string;
  requirement: PluginResourceRequirement;
}> {
  const out: Array<{ extensionId: string; requirement: PluginResourceRequirement }> = [];
  for (const manifest of manifestSource()) {
    for (const req of manifest.resourceRequirements ?? []) {
      out.push({ extensionId: manifest.id, requirement: req });
    }
  }
  return out;
}

// ─── Applicability ─────────────────────────────────────────

export type ResourceAttributes = {
  jurisdictionCode: string;
  sectorCodes: ReadonlySet<string>;
  kindCode: string;
};

export function isResourceRequirementApplicable(
  req: PluginResourceRequirement,
  resource: ResourceAttributes
): boolean {
  const rules = req.appliesWhen ?? {};
  if (rules.providerJurisdiction && rules.providerJurisdiction.length > 0) {
    if (!rules.providerJurisdiction.includes(resource.jurisdictionCode)) return false;
  }
  if (rules.resourceSectors && rules.resourceSectors.length > 0) {
    const hit = rules.resourceSectors.some((s) => resource.sectorCodes.has(s));
    if (!hit) return false;
  }
  if (rules.resourceKinds && rules.resourceKinds.length > 0) {
    if (!rules.resourceKinds.includes(resource.kindCode)) return false;
  }
  return true;
}

async function loadResourceAttributes(resourceId: string): Promise<ResourceAttributes | null> {
  const r = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: {
      resourceType: { select: { code: true } },
      provider: { select: { homeJurisdiction: { select: { code: true } } } },
      resourceSectors: { select: { sector: { select: { code: true } } } }
    }
  });
  if (!r) return null;
  const sectors = new Set<string>();
  for (const link of r.resourceSectors) sectors.add(link.sector.code);
  return {
    jurisdictionCode: r.provider.homeJurisdiction.code,
    sectorCodes: sectors,
    kindCode: r.resourceType.code
  };
}

export async function applicableRequirementsForResource(
  resourceId: string
): Promise<Array<{ extensionId: string; requirement: PluginResourceRequirement }>> {
  const attrs = await loadResourceAttributes(resourceId);
  if (!attrs) return [];
  return listAllResourceRequirements().filter(({ requirement }) =>
    isResourceRequirementApplicable(requirement, attrs)
  );
}

// ─── Sync ResourceVerification rows for a resource ─────────

/**
 * Idempotent. For every applicable requirement, ensure a ResourceVerification
 * row exists (pending). Returns the full set of rows after sync, including rows
 * for requirements no longer applicable (left for audit; the gate ignores them).
 */
export async function ensureResourceVerificationRows(resourceId: string) {
  const applicable = await applicableRequirementsForResource(resourceId);

  const existing = await prisma.resourceVerification.findMany({ where: { resourceId } });
  const existingKeys = new Set(existing.map((r) => `${r.extensionId}::${r.requirementCode}`));

  const toCreate: Array<{
    resourceId: string;
    extensionId: string;
    requirementCode: string;
    label: string;
    documentTypeHint: string | null;
  }> = [];
  for (const { extensionId, requirement } of applicable) {
    const key = `${extensionId}::${requirement.code}`;
    if (existingKeys.has(key)) continue;
    toCreate.push({
      resourceId,
      extensionId,
      requirementCode: requirement.code,
      label: requirement.label,
      documentTypeHint: requirement.documentTypeHint ?? null
    });
  }
  if (toCreate.length > 0) {
    await prisma.resourceVerification.createMany({ data: toCreate, skipDuplicates: true });
  }
  return prisma.resourceVerification.findMany({
    where: { resourceId },
    orderBy: [{ extensionId: "asc" }, { requirementCode: "asc" }]
  });
}

// ─── Status helpers ────────────────────────────────────────

export type VerificationStatusForResource = {
  applicable: Array<{
    rowId: string | null;
    extensionId: string;
    requirementCode: string;
    label: string;
    documentTypeHint: string | null;
    status: "verified" | "pending" | "rejected" | "missing";
    verifiedAt: Date | null;
    rejectionNote: string | null;
  }>;
  isFullyVerified: boolean;
};

export async function loadVerificationStatusForResource(
  resourceId: string
): Promise<VerificationStatusForResource> {
  const applicable = await applicableRequirementsForResource(resourceId);
  const rows = await prisma.resourceVerification.findMany({ where: { resourceId } });
  const rowsByKey = new Map(rows.map((r) => [`${r.extensionId}::${r.requirementCode}`, r]));

  const out: VerificationStatusForResource["applicable"] = applicable.map(
    ({ extensionId, requirement }) => {
      const key = `${extensionId}::${requirement.code}`;
      const row = rowsByKey.get(key);
      if (!row) {
        return {
          rowId: null,
          extensionId,
          requirementCode: requirement.code,
          label: requirement.label,
          documentTypeHint: requirement.documentTypeHint ?? null,
          status: "missing" as const,
          verifiedAt: null,
          rejectionNote: null
        };
      }
      let status: "verified" | "pending" | "rejected" | "missing";
      if (row.verifiedAt) status = "verified";
      else if (row.rejectionNote) status = "rejected";
      else status = "pending";
      return {
        rowId: row.id,
        extensionId,
        requirementCode: requirement.code,
        label: row.label,
        documentTypeHint: row.documentTypeHint,
        status,
        verifiedAt: row.verifiedAt,
        rejectionNote: row.rejectionNote
      };
    }
  );

  const isFullyVerified = out.length === 0 || out.every((r) => r.status === "verified");
  return { applicable: out, isFullyVerified };
}

export async function isResourceFullyVerified(resourceId: string): Promise<boolean> {
  const { isFullyVerified } = await loadVerificationStatusForResource(resourceId);
  return isFullyVerified;
}

// ─── Admin mutations ───────────────────────────────────────

export class ResourceVerificationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ResourceVerificationError";
  }
}

function isAdmin(user: SessionUser): boolean {
  return user.roles.includes("admin") || user.role.code === "admin";
}

export async function markResourceRequirementVerified(opts: {
  verificationId: string;
  user: SessionUser;
  note?: string;
}) {
  if (!isAdmin(opts.user)) {
    throw new ResourceVerificationError("forbidden", "Only admins can verify a requirement");
  }
  return prisma.resourceVerification.update({
    where: { id: opts.verificationId },
    data: { verifiedAt: new Date(), verifiedById: opts.user.id, rejectionNote: null }
  });
}

export async function markResourceRequirementRejected(opts: {
  verificationId: string;
  user: SessionUser;
  note: string;
}) {
  if (!isAdmin(opts.user)) {
    throw new ResourceVerificationError("forbidden", "Only admins can reject a requirement");
  }
  if (!opts.note || opts.note.trim().length === 0) {
    throw new ResourceVerificationError("note_required", "A reason is required when rejecting");
  }
  return prisma.resourceVerification.update({
    where: { id: opts.verificationId },
    data: { verifiedAt: null, verifiedById: null, rejectionNote: opts.note.trim() }
  });
}

/**
 * Auto-verify a requirement on behalf of an extension (e.g. after its REST
 * handler consulted an external API). verifiedById stays null so the admin UI
 * can render an "Auto-verified" badge. The extension must pass its own id.
 */
export async function autoMarkResourceRequirementVerified(opts: {
  resourceId: string;
  extensionId: string;
  requirementCode: string;
}) {
  if (!opts.extensionId || !opts.requirementCode || !opts.resourceId) {
    throw new ResourceVerificationError(
      "invalid_args",
      "resourceId, extensionId, and requirementCode are required"
    );
  }
  const existing = await prisma.resourceVerification.findUnique({
    where: {
      resourceId_extensionId_requirementCode: {
        resourceId: opts.resourceId,
        extensionId: opts.extensionId,
        requirementCode: opts.requirementCode
      }
    }
  });
  const fromManifest = listAllResourceRequirements().find(
    (r) => r.extensionId === opts.extensionId && r.requirement.code === opts.requirementCode
  );
  const label = existing?.label ?? fromManifest?.requirement.label ?? opts.requirementCode;
  const documentTypeHint =
    existing?.documentTypeHint ?? fromManifest?.requirement.documentTypeHint ?? null;

  return prisma.resourceVerification.upsert({
    where: {
      resourceId_extensionId_requirementCode: {
        resourceId: opts.resourceId,
        extensionId: opts.extensionId,
        requirementCode: opts.requirementCode
      }
    },
    create: {
      resourceId: opts.resourceId,
      extensionId: opts.extensionId,
      requirementCode: opts.requirementCode,
      label,
      documentTypeHint,
      verifiedAt: new Date(),
      verifiedById: null,
      rejectionNote: null
    },
    update: { verifiedAt: new Date(), verifiedById: null, rejectionNote: null }
  });
}

// ─── Admin queue ───────────────────────────────────────────

export async function listPendingResourceVerifications(opts?: { extensionId?: string }) {
  return prisma.resourceVerification.findMany({
    where: {
      verifiedAt: null,
      ...(opts?.extensionId ? { extensionId: opts.extensionId } : {})
    },
    include: {
      resource: {
        select: {
          id: true,
          title: true,
          slug: true,
          airId: true,
          resourceType: { select: { code: true } },
          provider: { select: { displayName: true, slug: true } }
        }
      }
    },
    orderBy: [{ createdAt: "asc" }]
  });
}
