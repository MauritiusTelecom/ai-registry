/**
 * Resource versioning services. See docs/specs/resource-versioning.md.
 *
 * Lifecycle:
 *   open draft  -> updateDraft (many)  -> submitDraft  -> approveDraft | rejectDraft
 *
 * On approve: copy draft's scalar fields back into Resource, set
 * currentPublishedVersionId = draft.id, clear draftVersionId.
 *
 * On reject: keep draftVersionId, status flips to "rejected"; provider
 * can edit and resubmit.
 */

import type { SessionUser } from "../auth/current-user";
import { Prisma } from "../../generated/prisma";
import { prisma } from "../prisma";
import {
  resolveAndApplyResourceEdit,
  type RawEditPayload
} from "./resource-edit-apply";

// ─── Constants + helpers ───────────────────────────────────

export const VERSIONED_FIELDS = [
  "title",
  "shortDescription",
  "longDescription",
  "accessUrl",
  "sourceCodeUrl",
  "documentationUrl",
  "termsUrl",
  "license",
  "versionLabel",
  "providerVersionNumber",
  "latencyTier",
  "riskLevelId"
] as const;

export type VersionedFieldName = (typeof VERSIONED_FIELDS)[number];

export type VersionedFieldPatch = Partial<{
  title: string;
  shortDescription: string;
  longDescription: string | null;
  accessUrl: string | null;
  sourceCodeUrl: string | null;
  documentationUrl: string | null;
  termsUrl: string | null;
  license: string | null;
  versionLabel: string | null;
  providerVersionNumber: string | null;
  latencyTier: string | null;
  riskLevelId: string;
}>;

export class VersioningError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "VersioningError";
  }
}

function isAdmin(user: SessionUser): boolean {
  return user.roles.includes("admin") || user.role.code === "admin";
}

// The seeded review role is "reviewer" (see prisma/seed.ts USER_ROLES); this
// matches the gate used by the sovereignty review-decide flow.
function isReviewer(user: SessionUser): boolean {
  return user.roles.includes("reviewer") || user.role.code === "reviewer";
}

async function getStatusIdByCode(code: "draft" | "submitted" | "approved" | "rejected"): Promise<string> {
  const row = await prisma.resourceVersionStatusType.findUnique({ where: { code } });
  if (!row) throw new VersioningError("seed_missing", `ResourceVersionStatusType not seeded: ${code}`);
  return row.id;
}

async function userOwnsResource(user: SessionUser, resourceId: string): Promise<boolean> {
  if (!user.provider) return false;
  const r = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { providerId: true }
  });
  return r?.providerId === user.provider.id;
}

// ─── Loaders ───────────────────────────────────────────────

export async function listVersions(resourceId: string) {
  return prisma.resourceVersion.findMany({
    where: { resourceId },
    include: {
      status: true,
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      rejectedBy: { select: { id: true, name: true, email: true } }
    },
    orderBy: { versionNumber: "desc" }
  });
}

/**
 * Resources that have an edit awaiting approval (a draft version in
 * "submitted" status). Powers the admin "pending edits" queue. Newest
 * submission first.
 */
export async function listPendingResourceEdits() {
  const submitted = await prisma.resourceVersionStatusType.findUnique({
    where: { code: "submitted" },
    select: { id: true }
  });
  if (!submitted) return [];

  const rows = await prisma.resource.findMany({
    where: { draftVersion: { is: { statusId: submitted.id } } },
    select: {
      id: true,
      title: true,
      slug: true,
      airId: true,
      provider: { select: { displayName: true, slug: true } },
      resourceType: { select: { code: true } },
      draftVersion: {
        select: {
          id: true,
          versionNumber: true,
          submittedAt: true,
          createdBy: { select: { name: true, email: true } }
        }
      }
    }
  });

  return rows.sort((a, b) => {
    const at = a.draftVersion?.submittedAt?.getTime() ?? 0;
    const bt = b.draftVersion?.submittedAt?.getTime() ?? 0;
    return bt - at;
  });
}

async function loadResourceForVersionOps(resourceId: string) {
  return prisma.resource.findUnique({
    where: { id: resourceId },
    include: {
      draftVersion: true,
      currentPublishedVersion: true
    }
  });
}

// ─── Read draft state (live snapshot + draft + diff) ───────

/** The live Resource's versioned scalar fields, keyed as a ResourceVersion. */
function liveSnapshot(resource: {
  title: string;
  shortDescription: string;
  longDescription: string | null;
  accessUrl: string | null;
  sourceCodeUrl: string | null;
  documentationUrl: string | null;
  termsUrl: string | null;
  license: string | null;
  versionLabel: string | null;
  versionNumber: string | null;
  latencyTier: string | null;
  riskLevelId: string;
}): Record<VersionedFieldName, string | null> {
  return {
    title: resource.title,
    shortDescription: resource.shortDescription,
    longDescription: resource.longDescription,
    accessUrl: resource.accessUrl,
    sourceCodeUrl: resource.sourceCodeUrl,
    documentationUrl: resource.documentationUrl,
    termsUrl: resource.termsUrl,
    license: resource.license,
    versionLabel: resource.versionLabel,
    // Resource.versionNumber is the provider's label; on a version it is providerVersionNumber.
    providerVersionNumber: resource.versionNumber,
    latencyTier: resource.latencyTier,
    riskLevelId: resource.riskLevelId
  };
}

/**
 * State for the provider edit UI: the live published scalars, the pending
 * draft (or null), the draft's status code, and the field-level diff between
 * them. Owner (or admin) only.
 */
export async function getDraftState(resourceId: string, user: SessionUser) {
  if (!isAdmin(user) && !(await userOwnsResource(user, resourceId))) {
    throw new VersioningError("forbidden", "You cannot view this resource");
  }

  const resource = await loadResourceForVersionOps(resourceId);
  if (!resource) throw new VersioningError("not_found", "Resource not found");

  const live = liveSnapshot(resource);
  const draft = resource.draftVersion;
  const diff = draft
    ? diffVersionsScalar(live, draft as unknown as Record<string, unknown>)
    : [];

  let draftStatus: string | null = null;
  if (draft) {
    const status = await prisma.resourceVersionStatusType.findUnique({
      where: { id: draft.statusId },
      select: { code: true }
    });
    draftStatus = status?.code ?? null;
  }

  return { live, draft, draftStatus, diff };
}

// ─── Open / get a draft ────────────────────────────────────

export async function openOrGetDraft(resourceId: string, user: SessionUser) {
  if (!isAdmin(user) && !(await userOwnsResource(user, resourceId))) {
    throw new VersioningError("forbidden", "You cannot edit this resource");
  }

  const resource = await loadResourceForVersionOps(resourceId);
  if (!resource) throw new VersioningError("not_found", "Resource not found");

  // If a draft already exists, return it
  if (resource.draftVersion) return resource.draftVersion;

  // Otherwise create one, snapshotting the current Resource scalar fields
  const draftStatusId = await getStatusIdByCode("draft");

  const maxVersion = await prisma.resourceVersion.aggregate({
    where: { resourceId },
    _max: { versionNumber: true }
  });
  const nextVersionNumber = (maxVersion._max.versionNumber ?? 0) + 1;

  const draft = await prisma.resourceVersion.create({
    data: {
      resourceId,
      versionNumber: nextVersionNumber,
      statusId: draftStatusId,
      title: resource.title,
      shortDescription: resource.shortDescription,
      longDescription: resource.longDescription,
      accessUrl: resource.accessUrl,
      sourceCodeUrl: resource.sourceCodeUrl,
      documentationUrl: resource.documentationUrl,
      termsUrl: resource.termsUrl,
      license: resource.license,
      versionLabel: resource.versionLabel,
      providerVersionNumber: resource.versionNumber,
      latencyTier: resource.latencyTier,
      riskLevelId: resource.riskLevelId,
      createdById: user.id
    }
  });

  await prisma.resource.update({
    where: { id: resourceId },
    data: { draftVersionId: draft.id }
  });

  return draft;
}

// ─── Update draft ──────────────────────────────────────────

export async function updateDraft(
  resourceId: string,
  user: SessionUser,
  patch: VersionedFieldPatch
) {
  if (!isAdmin(user) && !(await userOwnsResource(user, resourceId))) {
    throw new VersioningError("forbidden", "You cannot edit this resource");
  }

  const resource = await loadResourceForVersionOps(resourceId);
  if (!resource) throw new VersioningError("not_found", "Resource not found");
  if (!resource.draftVersion) {
    throw new VersioningError("no_draft", "No draft exists. Call openOrGetDraft first.");
  }
  // Confirm the draft is still editable (draft or rejected — not submitted/approved).
  const draftStatus = await prisma.resourceVersionStatusType.findUnique({
    where: { id: resource.draftVersion.statusId }
  });
  if (draftStatus?.code !== "draft" && draftStatus?.code !== "rejected") {
    throw new VersioningError("not_editable", `Draft is in status ${draftStatus?.code}; cannot edit`);
  }

  // If the draft was previously rejected and the provider is editing again,
  // flip it back to draft so it represents an in-progress change set.
  const draftStatusId = await getStatusIdByCode("draft");

  const updated = await prisma.resourceVersion.update({
    where: { id: resource.draftVersion.id },
    data: {
      ...patch,
      statusId: draftStatusId
    }
  });

  return updated;
}

// ─── Save a full edit onto the draft (scalars + relations) ─

function pstr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/**
 * Store a complete proposed edit on the resource's draft version: the full
 * payload (incl. sovereignty bases, evidence, endpoints, language/sector tags)
 * is kept in proposedPayload for replay on approval, and the scalar fields are
 * mirrored into the version columns so the diff/preview works without parsing
 * the JSON. Opens a draft if none exists.
 */
export async function saveDraftFull(
  resourceId: string,
  user: SessionUser,
  payload: RawEditPayload
) {
  if (!isAdmin(user) && !(await userOwnsResource(user, resourceId))) {
    throw new VersioningError("forbidden", "You cannot edit this resource");
  }

  const draft = await openOrGetDraft(resourceId, user);

  const statusRow = await prisma.resourceVersionStatusType.findUnique({
    where: { id: draft.statusId }
  });
  if (statusRow?.code !== "draft" && statusRow?.code !== "rejected") {
    throw new VersioningError(
      "not_editable",
      `Draft is in status ${statusRow?.code}; cannot edit`
    );
  }

  const draftStatusId = await getStatusIdByCode("draft");
  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : draft.title;
  const shortDescription =
    typeof payload.shortDescription === "string" && payload.shortDescription.trim()
      ? payload.shortDescription.trim()
      : draft.shortDescription;

  return prisma.resourceVersion.update({
    where: { id: draft.id },
    data: {
      title,
      shortDescription,
      longDescription: pstr(payload.longDescription),
      accessUrl: pstr(payload.accessUrl),
      sourceCodeUrl: pstr(payload.sourceCodeUrl),
      documentationUrl: pstr(payload.documentationUrl),
      termsUrl: pstr(payload.termsUrl),
      license: pstr(payload.license),
      versionLabel: pstr(payload.versionLabel),
      providerVersionNumber: pstr(payload.versionNumber),
      latencyTier: pstr(payload.latencyTier),
      proposedPayload: payload as Prisma.InputJsonValue,
      statusId: draftStatusId
    }
  });
}

// ─── Submit draft for review ───────────────────────────────

export async function submitDraft(resourceId: string, user: SessionUser) {
  if (!isAdmin(user) && !(await userOwnsResource(user, resourceId))) {
    throw new VersioningError("forbidden", "You cannot submit this resource");
  }

  const resource = await loadResourceForVersionOps(resourceId);
  if (!resource) throw new VersioningError("not_found", "Resource not found");
  if (!resource.draftVersion) throw new VersioningError("no_draft", "No draft to submit");

  const submittedStatusId = await getStatusIdByCode("submitted");

  return prisma.resourceVersion.update({
    where: { id: resource.draftVersion.id },
    data: {
      statusId: submittedStatusId,
      submittedAt: new Date()
    }
  });
}

// ─── Approve draft → flip to live ──────────────────────────

export async function approveDraft(opts: {
  resourceId: string;
  versionId: string;
  user: SessionUser;
  decisionNote?: string;
}) {
  if (!isAdmin(opts.user) && !isReviewer(opts.user)) {
    throw new VersioningError("forbidden", "Only verifiers or admins can approve");
  }

  const version = await prisma.resourceVersion.findUnique({
    where: { id: opts.versionId },
    include: { status: true }
  });
  if (!version || version.resourceId !== opts.resourceId) {
    throw new VersioningError("not_found", "Version not found");
  }
  if (version.status.code !== "submitted" && version.status.code !== "draft") {
    throw new VersioningError("not_approvable", `Version is in status ${version.status.code}`);
  }

  const approvedStatusId = await getStatusIdByCode("approved");
  const now = new Date();

  // Full-payload drafts (provider edited a listed resource via the full form):
  // replay the proposed edit — scalars AND relations (evidence, endpoints,
  // language/sector tags) — onto the live resource, attributed to the draft's
  // author. applyMyResourceUpdate runs its own transaction, so this happens
  // before we flip the version/pointers.
  const payload = version.proposedPayload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const applied = await resolveAndApplyResourceEdit(
      version.createdById,
      opts.resourceId,
      payload as unknown as RawEditPayload
    );
    if (!applied.ok) {
      throw new VersioningError("apply_failed", applied.error);
    }

    const approved = await prisma.resourceVersion.update({
      where: { id: version.id },
      data: {
        statusId: approvedStatusId,
        approvedById: opts.user.id,
        approvedAt: now,
        decisionNote: opts.decisionNote ?? null
      }
    });
    await prisma.resource.update({
      where: { id: opts.resourceId },
      data: {
        currentPublishedVersionId: approved.id,
        draftVersionId: null,
        lastReviewedAt: now,
        lastProviderUpdateAt: now
      }
    });
    return approved;
  }

  // Scalar-only / legacy draft: copy the snapshot columns onto the resource.
  return prisma.$transaction(async (tx) => {
    const approved = await tx.resourceVersion.update({
      where: { id: version.id },
      data: {
        statusId: approvedStatusId,
        approvedById: opts.user.id,
        approvedAt: now,
        decisionNote: opts.decisionNote ?? null
      }
    });

    await tx.resource.update({
      where: { id: opts.resourceId },
      data: {
        title: approved.title,
        shortDescription: approved.shortDescription,
        longDescription: approved.longDescription,
        accessUrl: approved.accessUrl,
        sourceCodeUrl: approved.sourceCodeUrl,
        documentationUrl: approved.documentationUrl,
        termsUrl: approved.termsUrl,
        license: approved.license,
        versionLabel: approved.versionLabel,
        versionNumber: approved.providerVersionNumber,
        latencyTier: approved.latencyTier,
        riskLevelId: approved.riskLevelId,
        currentPublishedVersionId: approved.id,
        draftVersionId: null,
        lastReviewedAt: now,
        lastProviderUpdateAt: now
      }
    });

    return approved;
  });
}

// ─── Reject draft → status flip, keep draftVersionId set ──

export async function rejectDraft(opts: {
  resourceId: string;
  versionId: string;
  user: SessionUser;
  decisionNote?: string;
}) {
  if (!isAdmin(opts.user) && !isReviewer(opts.user)) {
    throw new VersioningError("forbidden", "Only verifiers or admins can reject");
  }

  const version = await prisma.resourceVersion.findUnique({
    where: { id: opts.versionId },
    include: { status: true }
  });
  if (!version || version.resourceId !== opts.resourceId) {
    throw new VersioningError("not_found", "Version not found");
  }
  if (version.status.code !== "submitted") {
    throw new VersioningError("not_rejectable", `Version is in status ${version.status.code}`);
  }

  const rejectedStatusId = await getStatusIdByCode("rejected");

  return prisma.resourceVersion.update({
    where: { id: version.id },
    data: {
      statusId: rejectedStatusId,
      rejectedById: opts.user.id,
      rejectedAt: new Date(),
      decisionNote: opts.decisionNote ?? null
    }
  });
}

// ─── Discard draft ─────────────────────────────────────────

export async function discardDraft(resourceId: string, user: SessionUser) {
  if (!isAdmin(user) && !(await userOwnsResource(user, resourceId))) {
    throw new VersioningError("forbidden", "You cannot discard this draft");
  }

  const resource = await loadResourceForVersionOps(resourceId);
  if (!resource) throw new VersioningError("not_found", "Resource not found");
  if (!resource.draftVersion) return { ok: true };

  // Only delete if it's actually a draft (not submitted, not approved).
  const status = await prisma.resourceVersionStatusType.findUnique({
    where: { id: resource.draftVersion.statusId }
  });
  if (status?.code !== "draft" && status?.code !== "rejected") {
    throw new VersioningError(
      "not_discardable",
      `Draft is in status ${status?.code}; cannot discard`
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.resource.update({
      where: { id: resourceId },
      data: { draftVersionId: null }
    });
    await tx.resourceVersion.delete({ where: { id: resource.draftVersion!.id } });
  });

  return { ok: true };
}

// ─── Diff helper for the verifier UI ───────────────────────

export type FieldDelta = { field: VersionedFieldName; was: string | null; now: string | null };

export function diffVersionsScalar(
  base: Record<string, unknown> | null,
  candidate: Record<string, unknown>
): FieldDelta[] {
  const out: FieldDelta[] = [];
  for (const field of VERSIONED_FIELDS) {
    const wasRaw = base?.[field];
    const nowRaw = candidate[field];
    const was = wasRaw == null ? null : String(wasRaw);
    const now = nowRaw == null ? null : String(nowRaw);
    if (was !== now) out.push({ field, was, now });
  }
  return out;
}
