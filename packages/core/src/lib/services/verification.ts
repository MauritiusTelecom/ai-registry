/**
 * Multi-requirement provider verification.
 *
 * See docs/specs/multi-requirement-verification.md.
 *
 * Each extension declares verificationRequirements in its plugin manifest.
 * At runtime this module:
 *   1. Reads the applicability matrix from loaded plugin manifests.
 *   2. For any provider, computes which requirements apply.
 *   3. Stores per-(provider, extension, code) status rows in
 *      ProviderVerification.
 *   4. Exposes verify / reject / listPending / isFullyVerified helpers
 *      used by the admin queue, provider settings, and the public
 *      visibility gate.
 *
 * Extensions write nothing to ProviderVerification directly; the admin
 * UI does, via the generic API.
 */

import type { SessionUser } from "../auth/current-user";
import { prisma } from "../prisma";

// Types mirrored from @airegistry/sdk/plugin so this module doesn't
// import from the SDK (which depends on core, so importing back would
// be circular). Plugin-host calls setVerificationManifestSource with a
// structurally-compatible value at boot.
export type PluginVerificationApplicability = {
  providerJurisdiction?: string[];
  providerSectors?: string[];
  providerKinds?: string[];
};

export type PluginVerificationRequirement = {
  code: string;
  label: string;
  appliesWhen?: PluginVerificationApplicability;
  documentTypeHint?: string;
};

export type PluginManifestForVerification = {
  id: string;
  verificationRequirements?: PluginVerificationRequirement[];
};

// ─── Manifest source (host-supplied) ───────────────────────

/**
 * The verification service does not depend on plugin-host directly to
 * avoid a circular dep. The host calls `setVerificationManifestSource`
 * at boot, passing a function that returns the currently-loaded
 * manifests. If never set, no extension contributes requirements.
 */
type ManifestSource = () => readonly PluginManifestForVerification[];

let manifestSource: ManifestSource = () => [];

export function setVerificationManifestSource(source: ManifestSource): void {
  manifestSource = source;
}

export function listAllVerificationRequirements(): Array<{
  extensionId: string;
  requirement: PluginVerificationRequirement;
}> {
  const out: Array<{ extensionId: string; requirement: PluginVerificationRequirement }> = [];
  for (const manifest of manifestSource()) {
    for (const req of manifest.verificationRequirements ?? []) {
      out.push({ extensionId: manifest.id, requirement: req });
    }
  }
  return out;
}

// ─── Applicability ─────────────────────────────────────────

export type ProviderAttributes = {
  jurisdictionCode: string;
  sectorCodes: ReadonlySet<string>;
  kindCode: string;
};

export function isRequirementApplicable(
  req: PluginVerificationRequirement,
  provider: ProviderAttributes
): boolean {
  const rules = req.appliesWhen ?? {};
  if (rules.providerJurisdiction && rules.providerJurisdiction.length > 0) {
    if (!rules.providerJurisdiction.includes(provider.jurisdictionCode)) return false;
  }
  if (rules.providerSectors && rules.providerSectors.length > 0) {
    const hit = rules.providerSectors.some((s: string) => provider.sectorCodes.has(s));
    if (!hit) return false;
  }
  if (rules.providerKinds && rules.providerKinds.length > 0) {
    if (!rules.providerKinds.includes(provider.kindCode)) return false;
  }
  return true;
}

async function loadProviderAttributes(providerId: string): Promise<ProviderAttributes | null> {
  const p = await prisma.provider.findUnique({
    where: { id: providerId },
    select: {
      homeJurisdiction: { select: { code: true } },
      type: { select: { code: true } },
      resources: {
        select: { resourceSectors: { select: { sector: { select: { code: true } } } } }
      }
    }
  });
  if (!p) return null;
  const sectors = new Set<string>();
  for (const r of p.resources) {
    for (const link of r.resourceSectors) sectors.add(link.sector.code);
  }
  return {
    jurisdictionCode: p.homeJurisdiction.code,
    sectorCodes: sectors,
    kindCode: p.type.code
  };
}

export async function applicableRequirementsFor(
  providerId: string
): Promise<Array<{ extensionId: string; requirement: PluginVerificationRequirement }>> {
  const attrs = await loadProviderAttributes(providerId);
  if (!attrs) return [];
  return listAllVerificationRequirements().filter(({ requirement }) =>
    isRequirementApplicable(requirement, attrs)
  );
}

// ─── Sync ProviderVerification rows for a provider ────────

/**
 * Idempotent. For every applicable requirement, ensure a
 * ProviderVerification row exists (pending). Returns the full set of
 * rows for the provider after sync, including any rows for requirements
 * that are no longer applicable (those are left alone for audit
 * purposes; the visibility gate ignores them).
 */
export async function ensureVerificationRowsForProvider(providerId: string) {
  const applicable = await applicableRequirementsFor(providerId);

  const existing = await prisma.providerVerification.findMany({
    where: { providerId }
  });
  const existingKeys = new Set(existing.map((r) => `${r.extensionId}::${r.requirementCode}`));

  const toCreate: Array<{
    providerId: string;
    extensionId: string;
    requirementCode: string;
    label: string;
    documentTypeHint: string | null;
  }> = [];
  for (const { extensionId, requirement } of applicable) {
    const key = `${extensionId}::${requirement.code}`;
    if (existingKeys.has(key)) continue;
    toCreate.push({
      providerId,
      extensionId,
      requirementCode: requirement.code,
      label: requirement.label,
      documentTypeHint: requirement.documentTypeHint ?? null
    });
  }
  if (toCreate.length > 0) {
    await prisma.providerVerification.createMany({ data: toCreate, skipDuplicates: true });
  }
  return prisma.providerVerification.findMany({
    where: { providerId },
    orderBy: [{ extensionId: "asc" }, { requirementCode: "asc" }]
  });
}

// ─── Status helpers ────────────────────────────────────────

export type VerificationStatusForProvider = {
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

export async function loadVerificationStatusForProvider(
  providerId: string
): Promise<VerificationStatusForProvider> {
  const applicable = await applicableRequirementsFor(providerId);
  const rows = await prisma.providerVerification.findMany({ where: { providerId } });
  const rowsByKey = new Map(rows.map((r) => [`${r.extensionId}::${r.requirementCode}`, r]));

  const out: VerificationStatusForProvider["applicable"] = applicable.map(
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

  const isFullyVerified =
    out.length > 0 && out.every((r) => r.status === "verified");

  return { applicable: out, isFullyVerified };
}

export async function isProviderFullyVerified(providerId: string): Promise<boolean> {
  const { isFullyVerified } = await loadVerificationStatusForProvider(providerId);
  return isFullyVerified;
}

// ─── Admin mutations ───────────────────────────────────────

export class VerificationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "VerificationError";
  }
}

function isAdmin(user: SessionUser): boolean {
  return user.roles.includes("admin") || user.role.code === "admin";
}

export async function markRequirementVerified(opts: {
  verificationId: string;
  user: SessionUser;
  note?: string;
}) {
  if (!isAdmin(opts.user)) {
    throw new VerificationError("forbidden", "Only admins can verify a requirement");
  }
  return prisma.providerVerification.update({
    where: { id: opts.verificationId },
    data: {
      verifiedAt: new Date(),
      verifiedById: opts.user.id,
      rejectionNote: null
    }
  });
}

export async function markRequirementRejected(opts: {
  verificationId: string;
  user: SessionUser;
  note: string;
}) {
  if (!isAdmin(opts.user)) {
    throw new VerificationError("forbidden", "Only admins can reject a requirement");
  }
  if (!opts.note || opts.note.trim().length === 0) {
    throw new VerificationError("note_required", "A reason is required when rejecting");
  }
  return prisma.providerVerification.update({
    where: { id: opts.verificationId },
    data: {
      verifiedAt: null,
      verifiedById: null,
      rejectionNote: opts.note.trim()
    }
  });
}

// ─── Admin queue ───────────────────────────────────────────

export async function listPendingVerifications(opts?: {
  extensionId?: string;
}) {
  return prisma.providerVerification.findMany({
    where: {
      verifiedAt: null,
      ...(opts?.extensionId ? { extensionId: opts.extensionId } : {})
    },
    include: {
      provider: {
        include: {
          homeJurisdiction: true,
          documents: { include: { documentType: true } }
        }
      }
    },
    orderBy: [{ createdAt: "asc" }]
  });
}
