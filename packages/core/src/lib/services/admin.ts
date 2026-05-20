/**
 * Admin write services.
 *
 * Wraps the prisma operations used by `apps/portal/src/app/api/admin/*`
 * routes. Each helper is a thin transactional unit that:
 *
 *   - performs the prisma read/write/$transaction,
 *   - writes the audit row using the actor-context the route supplies,
 *   - returns either the changed row, a typed error code, or a small
 *     projection the route needs to compose its response.
 *
 * Validation, reference-code resolution, and email composition stay in the
 * route layer — services intentionally take pre-resolved IDs so the
 * prisma surface here remains untyped on reference codes.
 *
 * Exposed via @airegistry/sdk/server. Apps and extensions MUST NOT
 * perform admin writes via raw `prisma.*` calls.
 */

import { prisma } from "../prisma";

// Local writeAudit reference (the SDK barrel can't be imported here due to
// circular-dep risk; pull straight from the primitive).
async function audit(input: {
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
}): Promise<void> {
  const { writeAudit } = await import("../audit/write-audit");
  return writeAudit(input);
}

// ─── Branding ────────────────────────────────────────────────────────────

const BRANDING_SINGLETON_ID = "default";

export type AdminBrandingFullView = {
  registryName: string | null;
  logoUrl: string | null;
  copyrightLine: string | null;
  buildLine: string | null;
  heroEyebrowText: string | null;
  heroEyebrowIconUrl: string | null;
  operatorName: string | null;
  operatorContactEmail: string | null;
  operatorOfficeName: string | null;
  operatorOfficeAddress: string | null;
  operatorContactHours: string | null;
  updatedAt: string | null;
};

export async function loadAdminBrandingFull(): Promise<AdminBrandingFullView> {
  const row = await prisma.siteBranding.findUnique({
    where: { id: BRANDING_SINGLETON_ID }
  });
  return {
    registryName: row?.registryName ?? null,
    logoUrl: row?.logoUrl ?? null,
    copyrightLine: row?.copyrightLine ?? null,
    buildLine: row?.buildLine ?? null,
    heroEyebrowText: row?.heroEyebrowText ?? null,
    heroEyebrowIconUrl: row?.heroEyebrowIconUrl ?? null,
    operatorName: row?.operatorName ?? null,
    operatorContactEmail: row?.operatorContactEmail ?? null,
    operatorOfficeName: row?.operatorOfficeName ?? null,
    operatorOfficeAddress: row?.operatorOfficeAddress ?? null,
    operatorContactHours: row?.operatorContactHours ?? null,
    updatedAt: row?.updatedAt?.toISOString() ?? null
  };
}

export async function updateAdminBrandingFields(
  actorUserId: string,
  data: Record<string, string | null>
): Promise<void> {
  const before = await prisma.siteBranding.findUnique({
    where: { id: BRANDING_SINGLETON_ID }
  });
  const updated = await prisma.siteBranding.upsert({
    where: { id: BRANDING_SINGLETON_ID },
    update: { ...data, updatedById: actorUserId },
    create: { id: BRANDING_SINGLETON_ID, ...data, updatedById: actorUserId }
  });
  await audit({
    actorUserId,
    entityType: "site_branding",
    entityId: BRANDING_SINGLETON_ID,
    action: "branding.updated",
    previousValue: before
      ? {
          registryName: before.registryName,
          copyrightLine: before.copyrightLine,
          buildLine: before.buildLine,
          heroEyebrowText: before.heroEyebrowText,
          operatorName: before.operatorName,
          operatorContactEmail: before.operatorContactEmail,
          operatorOfficeName: before.operatorOfficeName,
          operatorOfficeAddress: before.operatorOfficeAddress,
          operatorContactHours: before.operatorContactHours
        }
      : null,
    newValue: {
      registryName: updated.registryName,
      copyrightLine: updated.copyrightLine,
      buildLine: updated.buildLine,
      heroEyebrowText: updated.heroEyebrowText,
      operatorName: updated.operatorName,
      operatorContactEmail: updated.operatorContactEmail,
      operatorOfficeName: updated.operatorOfficeName,
      operatorOfficeAddress: updated.operatorOfficeAddress,
      operatorContactHours: updated.operatorContactHours
    }
  });
}

export type AdminBrandingAssetSlot = "logo" | "hero";
const SLOT_FIELDS: Record<AdminBrandingAssetSlot, "logoUrl" | "heroEyebrowIconUrl"> = {
  logo: "logoUrl",
  hero: "heroEyebrowIconUrl"
};

export async function setAdminBrandingAsset(
  actorUserId: string,
  slot: AdminBrandingAssetSlot,
  publicPath: string,
  metadata: { sizeBytes: number; mimeType: string }
): Promise<{ previousPath: string | null }> {
  const field = SLOT_FIELDS[slot];
  const before = await prisma.siteBranding.findUnique({
    where: { id: BRANDING_SINGLETON_ID }
  });
  const previousPath = before ? before[field] : null;
  const updated = await prisma.siteBranding.upsert({
    where: { id: BRANDING_SINGLETON_ID },
    update: { [field]: publicPath, updatedById: actorUserId },
    create: { id: BRANDING_SINGLETON_ID, [field]: publicPath, updatedById: actorUserId }
  });
  await audit({
    actorUserId,
    entityType: "site_branding",
    entityId: BRANDING_SINGLETON_ID,
    action: `branding.${slot}_uploaded`,
    previousValue: { [field]: previousPath },
    newValue: {
      [field]: updated[field],
      sizeBytes: metadata.sizeBytes,
      mimeType: metadata.mimeType
    }
  });
  return { previousPath };
}

export async function clearAdminBrandingAsset(
  actorUserId: string,
  slot: AdminBrandingAssetSlot
): Promise<{ previousPath: string | null }> {
  const field = SLOT_FIELDS[slot];
  const before = await prisma.siteBranding.findUnique({
    where: { id: BRANDING_SINGLETON_ID }
  });
  const previousPath = before ? before[field] : null;
  await prisma.siteBranding.upsert({
    where: { id: BRANDING_SINGLETON_ID },
    update: { [field]: null, updatedById: actorUserId },
    create: { id: BRANDING_SINGLETON_ID, [field]: null, updatedById: actorUserId }
  });
  await audit({
    actorUserId,
    entityType: "site_branding",
    entityId: BRANDING_SINGLETON_ID,
    action: `branding.${slot}_cleared`,
    previousValue: { [field]: previousPath },
    newValue: { [field]: null }
  });
  return { previousPath };
}

// ─── Complaints ──────────────────────────────────────────────────────────

export async function deleteAdminComplaintIfExists(
  actorUserId: string,
  id: string
): Promise<boolean> {
  const existing = await prisma.complaint.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.$transaction(async (tx) => {
    await tx.enforcementAction.updateMany({
      where: { relatedComplaintId: id },
      data: { relatedComplaintId: null }
    });
    await tx.complaint.delete({ where: { id } });
  });
  await audit({
    actorUserId,
    entityType: "complaint",
    entityId: id,
    action: "complaint.deleted",
    previousValue: {
      complaintTypeId: existing.complaintTypeId,
      severityId: existing.severityId,
      statusId: existing.statusId,
      description: existing.description,
      complainantEmail: existing.complainantEmail
    }
  });
  return true;
}

export type ComplaintReplyTarget = {
  id: string;
  complainantEmail: string | null;
  complainantName: string | null;
};

export async function loadComplaintForReply(
  id: string
): Promise<ComplaintReplyTarget | null> {
  return prisma.complaint.findUnique({
    where: { id },
    select: { id: true, complainantEmail: true, complainantName: true }
  });
}

export type ComplaintForUpdate = {
  id: string;
  description: string;
  statusId: string;
  status: { code: string; name: string };
  assignedToId: string | null;
  resolutionSummary: string | null;
  resolvedAt: Date | null;
  complaintType: { name: string };
  severity: { name: string };
  targetResource: { title: string; provider: { displayName: string } } | null;
  targetProvider: { displayName: string } | null;
};

export async function loadComplaintForUpdate(id: string): Promise<ComplaintForUpdate | null> {
  return prisma.complaint.findUnique({
    where: { id },
    select: {
      id: true,
      description: true,
      statusId: true,
      status: { select: { code: true, name: true } },
      assignedToId: true,
      resolutionSummary: true,
      resolvedAt: true,
      complaintType: { select: { name: true } },
      severity: { select: { name: true } },
      targetResource: {
        select: { title: true, provider: { select: { displayName: true } } }
      },
      targetProvider: { select: { displayName: true } }
    }
  });
}

export async function findComplaintStatusById(
  id: string
): Promise<{ id: string; code: string; name: string } | null> {
  return prisma.complaintStatusType.findUnique({
    where: { id },
    select: { id: true, code: true, name: true }
  });
}

export async function findComplaintStatusByCode(
  code: string
): Promise<{ id: string; code: string; name: string } | null> {
  return prisma.complaintStatusType.findUnique({
    where: { code },
    select: { id: true, code: true, name: true }
  });
}

export async function findUserBasicById(
  id: string
): Promise<{ id: string; name: string; email: string } | null> {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true }
  });
}

export type ApplyComplaintUpdateInput = {
  data: {
    statusId?: string;
    assignedToId?: string | null;
    resolutionSummary?: string | null;
    resolvedAt?: Date | null;
  };
  before: {
    statusId: string;
    assignedToId: string | null;
    resolutionSummary: string | null;
    resolvedAt: Date | null;
  };
  action: string;
  autoBumped: boolean;
};

export async function applyAdminComplaintUpdate(
  actorUserId: string,
  id: string,
  input: ApplyComplaintUpdateInput
): Promise<void> {
  const updated = await prisma.complaint.update({
    where: { id },
    data: input.data,
    select: {
      id: true,
      statusId: true,
      assignedToId: true,
      resolutionSummary: true,
      resolvedAt: true
    }
  });
  await audit({
    actorUserId,
    entityType: "complaint",
    entityId: id,
    action: input.action,
    previousValue: input.before,
    newValue: {
      statusId: updated.statusId,
      assignedToId: updated.assignedToId,
      resolutionSummary: updated.resolutionSummary,
      resolvedAt: updated.resolvedAt,
      autoBumped: input.autoBumped
    }
  });
}

// ─── Contacts ────────────────────────────────────────────────────────────

export async function deleteAdminContactIfExists(
  actorUserId: string,
  id: string
): Promise<boolean> {
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.contact.delete({ where: { id } });
  await audit({
    actorUserId,
    entityType: "contact",
    entityId: id,
    action: "contact.deleted",
    previousValue: {
      email: existing.email,
      topic: existing.topic,
      messageLength: existing.message.length,
      emailVerified: existing.emailVerified
    }
  });
  return true;
}

export type ContactReplyTarget = {
  id: string;
  email: string;
  senderName: string;
};

export async function loadContactForReply(id: string): Promise<ContactReplyTarget | null> {
  return prisma.contact.findUnique({
    where: { id },
    select: { id: true, email: true, senderName: true }
  });
}

// ─── Providers (admin CRUD) ──────────────────────────────────────────────

export type AdminProviderListRow = {
  id: string;
  slug: string;
  displayName: string;
  typeCode: string;
  typeName: string;
  statusCode: string;
  statusName: string;
  jurisdictionCode: string;
  contactEmail: string;
  websiteUrl: string | null;
  resourceCount: number;
  createdAt: string;
};

export async function listAdminProvidersWithCount(
  where: Record<string, unknown>,
  page: number,
  pageSize: number
): Promise<{ rows: AdminProviderListRow[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      include: {
        type: { select: { code: true, name: true } },
        status: { select: { code: true, name: true } },
        homeJurisdiction: { select: { code: true } },
        _count: { select: { resources: true } }
      },
      orderBy: [{ status: { sortOrder: "asc" } }, { displayName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.provider.count({ where })
  ]);
  return {
    rows: rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      displayName: p.displayName,
      typeCode: p.type.code,
      typeName: p.type.name,
      statusCode: p.status.code,
      statusName: p.status.name,
      jurisdictionCode: p.homeJurisdiction.code,
      contactEmail: p.contactEmail,
      websiteUrl: p.websiteUrl,
      resourceCount: p._count.resources,
      createdAt: p.createdAt.toISOString()
    })),
    total
  };
}

export async function findProviderBySlugBasic(
  slug: string
): Promise<{ id: string } | null> {
  return prisma.provider.findUnique({ where: { slug }, select: { id: true } });
}

export async function findProviderBySlugWithJurisdiction(
  slug: string
): Promise<{ id: string; homeJurisdiction: { id: string; code: string } } | null> {
  return prisma.provider.findUnique({
    where: { slug },
    select: {
      id: true,
      homeJurisdiction: { select: { id: true, code: true } }
    }
  });
}

export type CreateAdminProviderInput = {
  slug: string;
  displayName: string;
  typeId: string;
  homeJurisdictionId: string;
  contactEmail: string;
  legalName: string | null;
  registrationNumber: string | null;
  websiteUrl: string | null;
  description: string | null;
  statusId: string;
  srcId: string;
  /** echoed into audit payload */
  typeCode: string;
  jurisdictionCode: string;
};

export async function createAdminProvider(
  actorUserId: string,
  input: CreateAdminProviderInput
): Promise<{ id: string }> {
  const created = await prisma.provider.create({
    data: {
      slug: input.slug,
      displayName: input.displayName,
      typeId: input.typeId,
      homeJurisdictionId: input.homeJurisdictionId,
      contactEmail: input.contactEmail,
      legalName: input.legalName,
      registrationNumber: input.registrationNumber,
      websiteUrl: input.websiteUrl,
      description: input.description,
      statusId: input.statusId,
      srcId: input.srcId,
      published: true,
      adminSuspended: false
    }
  });
  await audit({
    actorUserId,
    entityType: "provider",
    entityId: created.id,
    action: "provider.created",
    newValue: {
      slug: input.slug,
      displayName: input.displayName,
      type: input.typeCode,
      jurisdiction: input.jurisdictionCode,
      contactEmail: input.contactEmail
    }
  });
  return { id: created.id };
}

export type AdminProviderForEdit = {
  id: string;
  slug: string;
  displayName: string;
  contactEmail: string;
  legalContactEmail: string | null;
  legalName: string | null;
  registrationNumber: string | null;
  websiteUrl: string | null;
  documentationUrl: string | null;
  description: string | null;
  incidentChannel: string | null;
  oncallEmail: string | null;
  webhookUrl: string | null;
  published: boolean;
  adminSuspended: boolean;
  type: { code: string };
  homeJurisdiction: { code: string };
};

export async function loadAdminProviderForEdit(
  id: string
): Promise<AdminProviderForEdit | null> {
  return prisma.provider.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      displayName: true,
      contactEmail: true,
      legalContactEmail: true,
      legalName: true,
      registrationNumber: true,
      websiteUrl: true,
      documentationUrl: true,
      description: true,
      incidentChannel: true,
      oncallEmail: true,
      webhookUrl: true,
      published: true,
      adminSuspended: true,
      type: { select: { code: true } },
      homeJurisdiction: { select: { code: true } }
    }
  });
}

export async function applyAdminProviderUpdate(
  actorUserId: string,
  id: string,
  data: Record<string, unknown>,
  before: Record<string, unknown>
): Promise<void> {
  await prisma.provider.update({ where: { id }, data });
  await audit({
    actorUserId,
    entityType: "provider",
    entityId: id,
    action: "provider.updated",
    previousValue: before,
    newValue: data
  });
}

export type AdminProviderForDelete = {
  slug: string;
  displayName: string;
  _count: {
    resources: number;
    users: number;
    trustSignals: number;
    reviews: number;
    complaints: number;
    enforcementActions: number;
  };
};

export async function loadAdminProviderForDelete(
  id: string
): Promise<AdminProviderForDelete | null> {
  return prisma.provider.findUnique({
    where: { id },
    select: {
      slug: true,
      displayName: true,
      _count: {
        select: {
          resources: true,
          users: true,
          trustSignals: true,
          reviews: true,
          complaints: true,
          enforcementActions: true
        }
      }
    }
  });
}

export async function deleteAdminProvider(
  actorUserId: string,
  id: string,
  snapshot: { slug: string; displayName: string }
): Promise<void> {
  await prisma.provider.delete({ where: { id } });
  await audit({
    actorUserId,
    entityType: "provider",
    entityId: id,
    action: "provider.deleted",
    previousValue: snapshot
  });
}

export type AdminProviderForVerify = {
  id: string;
  displayName: string;
  contactEmail: string;
  legalContactEmail: string | null;
  status: { code: string; name: string };
};

export async function loadAdminProviderForVerify(
  id: string
): Promise<AdminProviderForVerify | null> {
  return prisma.provider.findUnique({
    where: { id },
    select: {
      id: true,
      displayName: true,
      contactEmail: true,
      legalContactEmail: true,
      status: { select: { code: true, name: true } }
    }
  });
}

export type ApplyProviderVerificationInput = {
  providerData: { statusId: string; adminSuspended?: boolean };
  trustSignalData: {
    kindId: string;
    statusId: string;
    decisionSummary: string;
    publicNote: string | null;
    internalNote: string | null;
  };
  beforeStatus: string;
  /** echoed into audit action label and newValue */
  newStatusCode: string;
  summary: string;
};

export async function applyAdminProviderVerification(
  actorUserId: string,
  providerId: string,
  input: ApplyProviderVerificationInput
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.provider.update({
      where: { id: providerId },
      data: input.providerData
    });
    await tx.trustSignal.create({
      data: {
        kindId: input.trustSignalData.kindId,
        targetProviderId: providerId,
        statusId: input.trustSignalData.statusId,
        decisionSummary: input.trustSignalData.decisionSummary,
        publicNote: input.trustSignalData.publicNote,
        internalNote: input.trustSignalData.internalNote,
        decidedById: actorUserId,
        decidedAt: new Date()
      }
    });
  });
  await audit({
    actorUserId,
    entityType: "provider",
    entityId: providerId,
    action: `provider.verification.${input.newStatusCode}`,
    previousValue: { status: input.beforeStatus },
    newValue: { status: input.newStatusCode, summary: input.summary }
  });
}

// ─── Resources (admin CRUD) ──────────────────────────────────────────────

export type AdminResourceListRow = {
  id: string;
  airId: string | null;
  slug: string;
  title: string;
  resourceType: { code: string; name: string };
  lifecycleStatus: { code: string; name: string };
  riskLevel: { code: string; name: string };
  primaryJurisdiction: { code: string };
  provider: { slug: string; displayName: string };
  publicVisibility: boolean;
  updatedAt: Date;
};

export async function listAdminResourcesWithCount(
  where: Record<string, unknown>,
  page: number,
  pageSize: number,
  include: Record<string, unknown>
): Promise<{ rows: AdminResourceListRow[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      include,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.resource.count({ where })
  ]);
  return { rows: rows as unknown as AdminResourceListRow[], total };
}

export async function findProviderBasicById(
  id: string
): Promise<{ id: string; slug: string; homeJurisdictionId: string } | null> {
  return prisma.provider.findUnique({
    where: { id },
    select: { id: true, slug: true, homeJurisdictionId: true }
  });
}

export async function findResourceBySlugInProvider(
  providerId: string,
  slug: string
): Promise<{ id: string } | null> {
  return prisma.resource.findFirst({
    where: { providerId, slug },
    select: { id: true }
  });
}

export type CreateAdminResourceInput = {
  slug: string;
  title: string;
  shortDescription: string;
  providerId: string;
  resourceTypeId: string;
  primaryJurisdictionId: string;
  lifecycleStatusId: string;
  listingOriginId: string;
  riskLevelId: string;
  publicVisibility: boolean;
  /** Optional override for the audit payload. Defaults to a minimal
   * `{ slug, title, type }` shape. Pass a richer object if the route
   * tracked kind+provider+risk together.
   */
  auditNewValue?: Record<string, unknown>;
  /** echoed into the default audit payload's `type` field. */
  resourceTypeCode?: string;
};

export async function createAdminResource(
  actorUserId: string,
  input: CreateAdminResourceInput
): Promise<{ id: string }> {
  const created = await prisma.resource.create({
    data: {
      slug: input.slug,
      title: input.title,
      shortDescription: input.shortDescription,
      providerId: input.providerId,
      resourceTypeId: input.resourceTypeId,
      primaryJurisdictionId: input.primaryJurisdictionId,
      lifecycleStatusId: input.lifecycleStatusId,
      listingOriginId: input.listingOriginId,
      riskLevelId: input.riskLevelId,
      publicVisibility: input.publicVisibility,
      airId: null
    }
  });
  await audit({
    actorUserId,
    entityType: "resource",
    entityId: created.id,
    action: "resource.created",
    newValue:
      input.auditNewValue ?? {
        slug: input.slug,
        title: input.title,
        type: input.resourceTypeCode ?? null
      }
  });
  return { id: created.id };
}

// For the big admin resource PATCH route, we expose the prisma operations
// the route needs as a few targeted helpers — the validation + nested
// reference-code resolution stays in the route. This is the same
// boundary used by applyMyResourceUpdate in portal.ts.

export type AdminResourceFullEditRow = {
  id: string;
  slug: string;
  airId: string | null;
  title: string;
  shortDescription: string;
  longDescription: string | null;
  publicVisibility: boolean;
  versionLabel: string | null;
  versionNumber: string | null;
  latencyTier: string | null;
  license: string | null;
  accessUrl: string | null;
  documentationUrl: string | null;
  sourceCodeUrl: string | null;
  termsUrl: string | null;
  resourceType: { code: string; name: string };
  lifecycleStatus: { code: string; name: string };
  riskLevel: { code: string; name: string };
  primaryJurisdiction: { code: string; name: string };
  provider: { id: string; slug: string; displayName: string };
  resourceBases: { sovereigntyBasis: { code: string } }[];
  resourceLanguages: { language: { code: string; name: string } }[];
  resourceSectors: { sector: { code: string; name: string } }[];
  evidence: Array<{
    id: string;
    title: string;
    description: string | null;
    referenceUrl: string | null;
    referenceIdentifier: string | null;
    issuingBody: string | null;
    publicVisibility: boolean;
    sovereigntyBasis: { code: string };
    evidenceType: { code: string };
  }>;
  endpoints: Array<{
    id: string;
    endpointUrl: string;
    documentationUrl: string | null;
    primary: boolean;
    active: boolean;
    protocol: { code: string };
    authMethod: { code: string };
    accessModel: { code: string };
    lastCheckStatus: { code: string };
  }>;
};

export async function loadAdminResourceForView(id: string) {
  return prisma.resource.findUnique({
    where: { id },
    include: {
      resourceType: { select: { code: true, name: true } },
      lifecycleStatus: { select: { code: true, name: true } },
      riskLevel: { select: { code: true, name: true } },
      primaryJurisdiction: { select: { code: true, name: true } },
      provider: { select: { id: true, slug: true, displayName: true } },
      resourceBases: { include: { sovereigntyBasis: { select: { code: true } } } },
      resourceLanguages: { include: { language: { select: { code: true, name: true } } } },
      resourceSectors: { include: { sector: { select: { code: true, name: true } } } },
      evidence: {
        include: {
          sovereigntyBasis: { select: { code: true } },
          evidenceType: { select: { code: true } }
        }
      },
      endpoints: {
        include: {
          protocol: { select: { code: true } },
          authMethod: { select: { code: true } },
          accessModel: { select: { code: true } },
          lastCheckStatus: { select: { code: true } }
        }
      }
    }
  });
}

export async function loadAdminResourceForEditPrecheck(id: string) {
  return prisma.resource.findUnique({
    where: { id },
    include: {
      provider: { select: { id: true, slug: true } },
      resourceType: { select: { code: true } },
      lifecycleStatus: { select: { code: true } },
      riskLevel: { select: { code: true } },
      primaryJurisdiction: { select: { code: true } },
      listingOrigin: { select: { code: true } }
    }
  });
}

export type AdminResourceForDeleteWithCount = {
  slug: string;
  title: string;
  airId: string | null;
  _count: {
    reviews: number;
    trustSignals: number;
    complaints: number;
    enforcementActions: number;
  };
};

export async function loadAdminResourceForDeleteWithCount(
  id: string
): Promise<AdminResourceForDeleteWithCount | null> {
  return prisma.resource.findUnique({
    where: { id },
    select: {
      slug: true,
      title: true,
      airId: true,
      _count: {
        select: {
          reviews: true,
          trustSignals: true,
          complaints: true,
          enforcementActions: true
        }
      }
    }
  });
}

export type ApplyAdminResourceUpdateInput = {
  data: Record<string, unknown>;
  before: Record<string, unknown>;
  newValue: Record<string, unknown>;
  basisRows?: { id: string; code: string }[];
  languageRows?: { id: string; code: string }[];
  sectorRows?: { id: string; code: string }[];
  evidenceResolved?: Array<{
    sovereigntyBasisId: string;
    evidenceTypeId: string;
    title: string;
    description: string | null;
    referenceUrl: string | null;
    referenceIdentifier: string | null;
    issuingBody: string | null;
    publicVisibility: boolean;
    submittedById: string;
  }>;
  endpointsResolved?: Array<{
    protocolId: string;
    endpointUrl: string;
    documentationUrl: string | null;
    authMethodId: string;
    accessModelId: string;
    primary: boolean;
    active: boolean;
    lastCheckStatusId: string;
  }>;
  basisCodes?: string[];
  languageCodes?: string[];
  sectorCodes?: string[];
  action?: string;
};

export async function applyAdminResourceUpdate(
  actorUserId: string,
  resourceId: string,
  input: ApplyAdminResourceUpdateInput
): Promise<void> {
  const {
    data,
    before,
    newValue,
    basisRows,
    languageRows,
    sectorRows,
    evidenceResolved,
    endpointsResolved,
    basisCodes,
    languageCodes,
    sectorCodes,
    action
  } = input;
  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.resource.update({ where: { id: resourceId }, data });
    }
    if (basisCodes !== undefined) {
      await tx.resourceSovereigntyBasis.deleteMany({ where: { resourceId } });
      if (basisRows && basisRows.length > 0) {
        await tx.resourceSovereigntyBasis.createMany({
          data: basisRows.map((b) => ({
            resourceId,
            sovereigntyBasisId: b.id,
            submittedById: actorUserId
          })),
          skipDuplicates: true
        });
      }
    }
    if (languageCodes !== undefined) {
      await tx.resourceLanguage.deleteMany({ where: { resourceId } });
      if (languageRows && languageRows.length > 0) {
        await tx.resourceLanguage.createMany({
          data: languageRows.map((l) => ({ resourceId, languageId: l.id })),
          skipDuplicates: true
        });
      }
    }
    if (sectorCodes !== undefined) {
      await tx.resourceSector.deleteMany({ where: { resourceId } });
      if (sectorRows && sectorRows.length > 0) {
        await tx.resourceSector.createMany({
          data: sectorRows.map((s) => ({ resourceId, sectorId: s.id })),
          skipDuplicates: true
        });
      }
    }
    if (evidenceResolved !== undefined) {
      await tx.sovereigntyEvidence.deleteMany({ where: { resourceId } });
      for (const row of evidenceResolved) {
        await tx.sovereigntyEvidence.create({ data: { ...row, resourceId } });
      }
    }
    if (endpointsResolved !== undefined) {
      await tx.resourceEndpoint.deleteMany({ where: { resourceId } });
      for (const row of endpointsResolved) {
        await tx.resourceEndpoint.create({ data: { ...row, resourceId } });
      }
    }
  });
  await audit({
    actorUserId,
    entityType: "resource",
    entityId: resourceId,
    action: action ?? "resource.updated",
    previousValue: before,
    newValue
  });
}

export type AdminResourceForDelete = {
  slug: string;
  title: string;
  airId: string | null;
  provider: { slug: string };
};

export async function loadAdminResourceForDelete(
  id: string
): Promise<AdminResourceForDelete | null> {
  return prisma.resource.findUnique({
    where: { id },
    select: {
      slug: true,
      title: true,
      airId: true,
      provider: { select: { slug: true } }
    }
  });
}

export async function deleteAdminResource(
  actorUserId: string,
  id: string,
  snapshot: { slug: string; title: string }
): Promise<void> {
  await prisma.resource.delete({ where: { id } });
  await audit({
    actorUserId,
    entityType: "resource",
    entityId: id,
    action: "resource.deleted",
    previousValue: snapshot
  });
}

// ─── Resource elevate ────────────────────────────────────────────────────

export async function loadAdminResourceForElevate(id: string) {
  return prisma.resource.findUnique({
    where: { id },
    include: {
      lifecycleStatus: { select: { code: true } },
      provider: { select: { id: true } }
    }
  });
}

export async function findOfficialAuthorityFull(id: string) {
  return prisma.officialAuthority.findUnique({
    where: { id },
    include: { jurisdiction: { select: { code: true } } }
  });
}

export type ApplyAdminResourceElevateInput = {
  authorisation: {
    resourceId: string;
    officialAuthorityId: string;
    statusId: string;
    authorisationReference: string | null;
    authorisationDocumentUrl: string | null;
    publicNote: string | null;
    internalNote: string | null;
    validFrom: Date | null;
    validUntil: Date | null;
    decidedAt: Date;
  };
  trustSignal: {
    kindId: string;
    targetResourceId: string;
    targetProviderId: string;
    statusId: string;
    decisionSummary: string;
    publicNote: string | null;
    internalNote: string | null;
    validFrom: Date | null;
    validUntil: Date | null;
    decidedAt: Date;
    authorityOrganisation: string;
  };
  audit: {
    action: string;
    newValue: Record<string, unknown>;
  };
};

export async function applyAdminResourceElevate(
  actorUserId: string,
  input: ApplyAdminResourceElevateInput
): Promise<{ authorisationId: string }> {
  const created = await prisma.$transaction(async (tx) => {
    const auth = await tx.officialResourceAuthorisation.create({
      data: {
        ...input.authorisation,
        decidedById: actorUserId
      }
    });
    await tx.trustSignal.create({
      data: {
        ...input.trustSignal,
        decidedById: actorUserId
      }
    });
    return auth;
  });
  await audit({
    actorUserId,
    entityType: "resource",
    entityId: input.authorisation.resourceId,
    action: input.audit.action,
    newValue: input.audit.newValue
  });
  return { authorisationId: created.id };
}

// ─── Resource transition ─────────────────────────────────────────────────

export async function loadAdminResourceForTransition(id: string) {
  return prisma.resource.findUnique({
    where: { id },
    include: {
      lifecycleStatus: { select: { code: true } },
      provider: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          contactEmail: true,
          legalContactEmail: true
        }
      },
      resourceType: { select: { code: true } }
    }
  });
}

export type ApplyAdminResourceTransitionInput = {
  resourceId: string;
  resourceData: Record<string, unknown>;
  trustSignal: {
    kindId: string;
    targetProviderId: string;
    statusId: string;
    decisionSummary: string;
    publicNote: string | null;
    internalNote: string | null;
  };
  audit: {
    action: string;
    previousValue: Record<string, unknown>;
    newValue: Record<string, unknown>;
  };
};

export async function applyAdminResourceTransition(
  actorUserId: string,
  input: ApplyAdminResourceTransitionInput
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.resource.update({
      where: { id: input.resourceId },
      data: input.resourceData
    });
    await tx.trustSignal.create({
      data: {
        kindId: input.trustSignal.kindId,
        targetResourceId: input.resourceId,
        targetProviderId: input.trustSignal.targetProviderId,
        statusId: input.trustSignal.statusId,
        decisionSummary: input.trustSignal.decisionSummary,
        publicNote: input.trustSignal.publicNote,
        internalNote: input.trustSignal.internalNote,
        decidedById: actorUserId,
        decidedAt: new Date()
      }
    });
  });
  await audit({
    actorUserId,
    entityType: "resource",
    entityId: input.resourceId,
    action: input.audit.action,
    previousValue: input.audit.previousValue,
    newValue: input.audit.newValue
  });
}

// ─── Reviews ─────────────────────────────────────────────────────────────

export async function listAdminReviewsQueue() {
  return prisma.review.findMany({
    where: {
      resourceId: { not: null },
      status: { code: { in: ["open", "in_review"] } }
    },
    orderBy: { createdAt: "asc" },
    include: {
      status: { select: { code: true, name: true } },
      reviewType: { select: { code: true, name: true } },
      resource: {
        include: {
          lifecycleStatus: { select: { code: true, name: true } },
          provider: { select: { id: true, slug: true, displayName: true } },
          resourceType: { select: { code: true } }
        }
      }
    }
  });
}

export async function findReviewForDecide(id: string) {
  return prisma.review.findUnique({
    where: { id },
    include: {
      status: { select: { code: true } },
      resource: {
        include: {
          provider: {
            select: {
              id: true,
              slug: true,
              displayName: true,
              contactEmail: true,
              legalContactEmail: true
            }
          },
          lifecycleStatus: { select: { code: true } },
          resourceType: { select: { code: true } }
        }
      }
    }
  });
}

export type ApplyAdminReviewDecisionInput = {
  resourceId: string;
  resourceData: Record<string, unknown>;
  reviewData: Record<string, unknown>;
  /** Pre-built checklist rows (with reviewId baked in by caller). */
  checklistCreates?: Array<{
    reviewId: string;
    itemCode: string;
    question: string;
    resultId: string;
  }>;
  decision: string;
  decisionSummary: string;
};

export async function applyAdminReviewDecision(
  actorUserId: string,
  reviewId: string,
  input: ApplyAdminReviewDecisionInput
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (input.checklistCreates && input.checklistCreates.length > 0) {
      await tx.reviewChecklistItem.createMany({ data: input.checklistCreates });
    }
    await tx.resource.update({
      where: { id: input.resourceId },
      data: input.resourceData
    });
    await tx.review.update({
      where: { id: reviewId },
      data: input.reviewData
    });
  });
  await audit({
    actorUserId,
    entityType: "review",
    entityId: reviewId,
    action: `review.${input.decision}`,
    newValue: {
      resourceId: input.resourceId,
      decision: input.decision,
      decisionSummary: input.decisionSummary
    }
  });
}

// ─── Users ───────────────────────────────────────────────────────────────

export type AdminUserListRow = {
  id: string;
  email: string;
  name: string;
  role: { code: string; name: string };
  status: { code: string; name: string };
  emailVerified: boolean;
  provider: { id: string; slug: string; displayName: string } | null;
  createdAt: string;
};

export async function listAdminUsersWithCount(
  where: Record<string, unknown>,
  page: number,
  pageSize: number
): Promise<{ rows: AdminUserListRow[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        role: { select: { code: true, name: true } },
        status: { select: { code: true, name: true } },
        provider: { select: { id: true, slug: true, displayName: true } }
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.user.count({ where })
  ]);
  return {
    rows: rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      emailVerified: u.emailVerified,
      provider: u.provider,
      createdAt: u.createdAt.toISOString()
    })),
    total
  };
}

export async function findUserByEmailBasic(
  email: string
): Promise<{ id: string } | null> {
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

export async function findProviderBySlugForAssign(
  slug: string
): Promise<{ id: string; displayName: string } | null> {
  return prisma.provider.findUnique({
    where: { slug },
    select: { id: true, displayName: true }
  });
}

export type CreateAdminUserInput = {
  email: string;
  name: string;
  passwordHash: string | null;
  roleId: string;
  statusId: string;
  providerId: string | null;
  emailVerified: boolean;
  onboardingComplete?: boolean;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
  /** echoed into audit */
  roleCode: string;
  statusCode: string;
  providerSlug?: string | null;
};

export async function createAdminUser(
  actorUserId: string,
  input: CreateAdminUserInput
): Promise<{ id: string }> {
  const created = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      roleId: input.roleId,
      statusId: input.statusId,
      providerId: input.providerId,
      emailVerified: input.emailVerified,
      onboardingComplete: input.onboardingComplete ?? false,
      verificationToken: input.verificationToken ?? null,
      verificationTokenExpiry: input.verificationTokenExpiry ?? null
    }
  });
  await audit({
    actorUserId,
    entityType: "user",
    entityId: created.id,
    action: "user.created",
    newValue: {
      email: input.email,
      role: input.roleCode,
      status: input.statusCode,
      providerSlug: input.providerSlug ?? null
    }
  });
  return { id: created.id };
}

export async function loadAdminUserForEdit(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      role: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      provider: { select: { id: true, slug: true, displayName: true } }
    }
  });
}

export async function countOtherActiveAdmins(excludeUserId: string): Promise<number> {
  return prisma.user.count({
    where: {
      id: { not: excludeUserId },
      role: { code: "admin" },
      status: { code: "active" }
    }
  });
}

export async function applyAdminUserUpdate(
  actorUserId: string,
  id: string,
  data: Record<string, unknown>,
  before: Record<string, unknown>
): Promise<void> {
  await prisma.user.update({ where: { id }, data });
  await audit({
    actorUserId,
    entityType: "user",
    entityId: id,
    action: "user.updated",
    previousValue: before,
    newValue: data
  });
}

export async function deleteAdminUser(
  actorUserId: string,
  id: string,
  snapshot: { email: string; roleCode: string }
): Promise<void> {
  // Null out actor refs in audit log so the historic trail survives the
  // deletion (the AuditLog FK is intentionally nullable for this case).
  await prisma.auditLog.updateMany({
    where: { actorUserId: id },
    data: { actorUserId: null }
  });
  await prisma.user.delete({ where: { id } });
  await audit({
    actorUserId,
    entityType: "user",
    entityId: id,
    action: "user.deleted",
    previousValue: snapshot
  });
}
