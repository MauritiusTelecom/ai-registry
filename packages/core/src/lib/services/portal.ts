/**
 * Portal-self read services.
 *
 * Server pages under app/portal, app/provider, app/verifier, app/sovereign
 * read their own actor-scoped data via these helpers instead of constructing
 * Prisma queries inline. Each helper:
 *
 *   1. Applies the actor-scope predicate internally (provider can only see
 *      their own provider's data; sovereign sees its jurisdiction's data;
 *      verifier sees the review queue cross-provider but with §7
 *      separation-of-duties enforced at the write layer).
 *   2. Returns a plain TypeScript projection — no Prisma row types leak.
 *   3. Composes well with other helpers so server pages stay thin.
 *
 * Exposed via @airegistry/sdk/server. Apps and extensions MUST NOT read
 * actor-scoped data via raw `prisma.*` calls.
 *
 * Constitution alignment:
 *   - §5 (visibility rule): only public-visible content reaches non-owner
 *     callers, even when those callers are the actor's own dashboards.
 *   - §7 (separation of duties): dashboards expose aggregate counts but
 *     not write operations; writes go through services that enforce
 *     assertCanReview.
 */

import type { Prisma } from "../../generated/prisma";
import { prisma } from "../prisma";

// ─── Provider dashboard ───────────────────────────────────────────────────

/**
 * The data the provider portal dashboard renders. Order matches the original
 * `Promise.all([...])` in apps/portal/src/app/provider/page.tsx.
 */
export type ProviderDashboardStats = {
  /** Total resources in this provider's catalogue, including drafts. */
  totalResources: number;
  /** Resources currently in the `listed` lifecycle. */
  listedResources: number;
  /** Resources in flight: draft, submitted, in-review, or needs-update. */
  openSubmissions: number;
  /** Open complaints targeting this provider or any of its resources. */
  openComplaints: number;
  /** Open reviews of this provider or any of its resources. */
  openReviews: number;
  /** Enforcement actions against this provider or any of its resources. */
  enforcementActions: number;
};

/**
 * Provider dashboard counts, scoped to the actor's provider.
 *
 * Returns the all-zeros sentinel when `providerId` is null — the portal page
 * renders an "unassigned" CTA in that case.
 */
export async function loadProviderDashboardStats(
  providerId: string | null
): Promise<ProviderDashboardStats> {
  if (!providerId) {
    return {
      totalResources: 0,
      listedResources: 0,
      openSubmissions: 0,
      openComplaints: 0,
      openReviews: 0,
      enforcementActions: 0
    };
  }
  const [
    totalResources,
    listedResources,
    openSubmissions,
    openComplaints,
    openReviews,
    enforcementActions
  ] = await Promise.all([
    prisma.resource.count({ where: { providerId } }),
    prisma.resource.count({
      where: { providerId, lifecycleStatus: { code: "listed" } }
    }),
    prisma.resource.count({
      where: {
        providerId,
        lifecycleStatus: {
          code: { in: ["draft", "submitted", "in_review", "needs_update"] }
        }
      }
    }),
    prisma.complaint.count({
      where: {
        OR: [{ targetProviderId: providerId }, { targetResource: { providerId } }],
        status: { code: { in: ["open", "investigating"] } }
      }
    }),
    prisma.review.count({
      where: {
        OR: [{ providerId }, { resource: { providerId } }],
        status: { code: { in: ["open", "in_review"] } }
      }
    }),
    prisma.enforcementAction.count({
      where: {
        OR: [{ targetProviderId: providerId }, { targetResource: { providerId } }]
      }
    })
  ]);
  return {
    totalResources,
    listedResources,
    openSubmissions,
    openComplaints,
    openReviews,
    enforcementActions
  };
}

// ─── Verifier dashboard ───────────────────────────────────────────────────

export type VerifierDashboardStats = {
  /** Reviews currently in the queue (open + in-review). */
  openReviews: number;
  /** Reviews decided in the last 30 days. */
  decidedLast30Days: number;
};

/**
 * Verifier dashboard counts. No actor-scope predicate — verifiers see the
 * cross-provider queue. Per-decision separation-of-duties is enforced at
 * the write site (assertCanReview) by the review service.
 */
export async function loadVerifierDashboardStats(): Promise<VerifierDashboardStats> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [openReviews, decidedLast30Days] = await Promise.all([
    prisma.review.count({
      where: { status: { code: { in: ["open", "in_review"] } } }
    }),
    prisma.review.count({
      where: {
        status: { code: "decided" },
        completedAt: { gte: thirtyDaysAgo }
      }
    })
  ]);
  return { openReviews, decidedLast30Days };
}

// ─── Sovereign dashboard ──────────────────────────────────────────────────

export type SovereignDashboardStats = {
  /** Resources currently `listed` in the deployment's jurisdiction. */
  listedInJurisdiction: number;
  /** Providers domiciled in the deployment's jurisdiction. */
  providersInJurisdiction: number;
  /** Open or investigating complaints (cross-provider). */
  openIncidents: number;
};

/**
 * Sovereign dashboard counts, scoped to the deployment's jurisdiction.
 * Caller passes the jurisdiction code from RegistryConfig (no internal
 * config dependency so this stays trivially testable).
 *
 * `sectorCount` and `sovereignBasesCount` are reference-catalog totals;
 * the page reads them via `countReferenceTable(...)` directly.
 */
export async function loadSovereignDashboardStats(
  jurisdictionCode: string
): Promise<SovereignDashboardStats> {
  const [listedInJurisdiction, providersInJurisdiction, openIncidents] =
    await Promise.all([
      prisma.resource.count({
        where: {
          primaryJurisdiction: { code: jurisdictionCode },
          lifecycleStatus: { code: "listed" }
        }
      }),
      prisma.provider.count({
        where: { homeJurisdiction: { code: jurisdictionCode } }
      }),
      prisma.complaint.count({
        where: { status: { code: { in: ["open", "investigating"] } } }
      })
    ]);
  return { listedInJurisdiction, providersInJurisdiction, openIncidents };
}

// ─── Provider portal: list pages ─────────────────────────────────────────
//
// Each loader below applies the actor-scope predicate internally (provider
// can only see their own provider's data). Pages call one loader per list
// page and render its public projection — no Prisma row shapes escape.

const PRE_LISTED_LIFECYCLE = [
  "draft",
  "submitted",
  "in_review",
  "needs_update"
] as const;

export type ProviderResourceRow = {
  id: string;
  airId: string | null;
  slug: string;
  title: string;
  kind: string;
  /** Display status from `deriveDisplayStatus` — "verified" / "trusted" / etc. */
  status: string;
  lifecycle: string;
  lifecycleCode: string;
  /** ISO date "YYYY-MM-DD". */
  updatedAt: string;
};

/**
 * The provider's own catalogue, all lifecycles. Used by /provider/resources.
 */
export async function loadMyResources(
  providerId: string
): Promise<ProviderResourceRow[]> {
  const { deriveDisplayStatus } = await import("../discovery/serializers");
  const rows = await prisma.resource.findMany({
    where: { providerId },
    include: {
      resourceType: { select: { code: true } },
      lifecycleStatus: true,
      trustSignals: { include: { kind: true, status: true } }
    },
    orderBy: [{ lifecycleStatus: { sortOrder: "asc" } }, { updatedAt: "desc" }]
  });
  return rows.map((r) => ({
    id: r.id,
    airId: r.airId,
    slug: r.slug,
    title: r.title,
    kind: r.resourceType.code,
    status: deriveDisplayStatus({
      lifecycleStatus: r.lifecycleStatus,
      trustSignals: r.trustSignals
    }),
    lifecycle: r.lifecycleStatus.name,
    lifecycleCode: r.lifecycleStatus.code,
    updatedAt: r.updatedAt.toISOString().slice(0, 10)
  }));
}

export type ProviderSubmissionRow = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  lifecycle: string;
  lifecycleCode: string;
  status: string;
  submittedAt: string | null;
  updatedAt: string;
};

/**
 * The provider's resources currently in flight (pre-listed lifecycles).
 * Used by /provider/submissions.
 */
export async function loadMySubmissions(
  providerId: string
): Promise<ProviderSubmissionRow[]> {
  const { deriveDisplayStatus } = await import("../discovery/serializers");
  const rows = await prisma.resource.findMany({
    where: {
      providerId,
      lifecycleStatus: { code: { in: [...PRE_LISTED_LIFECYCLE] } }
    },
    include: {
      resourceType: { select: { code: true } },
      lifecycleStatus: true,
      trustSignals: { include: { kind: true, status: true } }
    },
    orderBy: [{ lifecycleStatus: { sortOrder: "asc" } }, { updatedAt: "desc" }]
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    kind: r.resourceType.code,
    lifecycle: r.lifecycleStatus.name,
    lifecycleCode: r.lifecycleStatus.code,
    status: deriveDisplayStatus({
      lifecycleStatus: r.lifecycleStatus,
      trustSignals: r.trustSignals
    }),
    submittedAt: r.submittedAt ? r.submittedAt.toISOString().slice(0, 10) : null,
    updatedAt: r.updatedAt.toISOString().slice(0, 10)
  }));
}

export type ProviderReviewRow = {
  id: string;
  target: string;
  targetSlug: string | null;
  type: string;
  /** Raw status code — page applies its own display mapping. */
  statusCode: string;
  startedAt: string | null;
  completedAt: string | null;
  decisionSummary: string | null;
};

/**
 * Reviews of the provider or any of its resources. Used by /provider/reviews.
 */
export async function loadMyReviews(
  providerId: string
): Promise<ProviderReviewRow[]> {
  const rows = await prisma.review.findMany({
    where: { OR: [{ providerId }, { resource: { providerId } }] },
    include: {
      reviewType: { select: { name: true } },
      status: { select: { code: true, name: true } },
      resource: { select: { slug: true, title: true } }
    },
    orderBy: [{ status: { sortOrder: "asc" } }, { createdAt: "desc" }],
    take: 200
  });
  return rows.map((r) => ({
    id: r.id,
    target: r.resource?.title ?? "Provider record",
    targetSlug: r.resource?.slug ?? null,
    type: r.reviewType.name,
    statusCode: r.status.code,
    startedAt: r.startedAt ? r.startedAt.toISOString().slice(0, 10) : null,
    completedAt: r.completedAt ? r.completedAt.toISOString().slice(0, 10) : null,
    decisionSummary: r.decisionSummary
  }));
}

export type ProviderComplaintRow = {
  id: string;
  ts: string;
  target: string;
  targetSlug: string | null;
  type: string;
  severityCode: string;
  severityName: string;
  statusCode: string;
  excerpt: string;
};

/**
 * Complaints filed at the provider or any of its resources. Used by
 * /provider/complaints.
 */
export async function loadMyComplaints(
  providerId: string
): Promise<ProviderComplaintRow[]> {
  const rows = await prisma.complaint.findMany({
    where: {
      OR: [{ targetProviderId: providerId }, { targetResource: { providerId } }]
    },
    include: {
      complaintType: { select: { name: true } },
      severity: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      targetResource: { select: { slug: true, title: true } },
      targetProvider: { select: { displayName: true } }
    },
    orderBy: [{ status: { sortOrder: "asc" } }, { createdAt: "desc" }],
    take: 200
  });
  return rows.map((c) => ({
    id: c.id,
    ts: c.submittedAt.toISOString().slice(0, 10),
    target:
      c.targetResource?.title ??
      c.targetProvider?.displayName ??
      "(unknown)",
    targetSlug: c.targetResource?.slug ?? null,
    type: c.complaintType.name,
    severityCode: c.severity.code,
    severityName: c.severity.name,
    statusCode: c.status.code,
    excerpt: c.description.slice(0, 240)
  }));
}

export type ProviderIncidentRow = {
  id: string;
  ts: string;
  action: string;
  target: string;
  targetSlug: string | null;
  reason: string;
  publicNote: string | null;
};

/**
 * Enforcement actions taken against the provider or any of its resources.
 * Used by /provider/incidents.
 */
export async function loadMyIncidents(
  providerId: string
): Promise<ProviderIncidentRow[]> {
  const rows = await prisma.enforcementAction.findMany({
    where: {
      OR: [{ targetProviderId: providerId }, { targetResource: { providerId } }]
    },
    include: {
      actionType: { select: { name: true } },
      targetResource: { select: { slug: true, title: true } },
      targetProvider: { select: { displayName: true } }
    },
    orderBy: { performedAt: "desc" },
    take: 200
  });
  return rows.map((a) => ({
    id: a.id,
    ts: a.performedAt.toISOString().replace("T", " ").slice(0, 19),
    action: a.actionType.name,
    target:
      a.targetResource?.title ??
      a.targetProvider?.displayName ??
      "(unknown)",
    targetSlug: a.targetResource?.slug ?? null,
    reason: a.reason,
    publicNote: a.publicNote
  }));
}

export type ProviderContactRequestRow = {
  id: string;
  senderName: string;
  organisationName: string | null;
  email: string;
  topic: string;
  message: string;
  createdAt: string;
  linkedUserName: string | null;
  linkedUserEmail: string | null;
};

// ─── Portal: self-service profile + provider notifications ─────────────

export type ProfileUpdatePatch = {
  name?: string;
  organisationName?: string | null;
};

export type ProfileUpdateResult = {
  id: string;
  name: string;
  organisationName: string | null;
  email: string;
};

/**
 * Apply the actor's own profile update and write the audit row atomically.
 * The before-snapshot lives inside the service so the route can't forget
 * the previousValue field.
 */
export async function updateMyProfile(
  userId: string,
  patch: ProfileUpdatePatch
): Promise<ProfileUpdateResult> {
  const prev = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, organisationName: true }
  });
  const updated = await prisma.user.update({
    where: { id: userId },
    data: patch,
    select: { id: true, name: true, organisationName: true, email: true }
  });
  await writeAuditFromCore({
    actorUserId: userId,
    entityType: "user",
    entityId: userId,
    action: "user.profile_updated",
    previousValue: prev,
    newValue: { name: updated.name, organisationName: updated.organisationName }
  });
  return updated;
}

export type ProviderNotificationsPatch = {
  incidentChannel?: string | null;
  oncallEmail?: string | null;
  webhookUrl?: string | null;
};

/**
 * Update the provider's notification routing config + audit. Returns null
 * if the provider doesn't exist (the route returns 404 for that case).
 */
export async function updateProviderNotificationsConfig(
  actorUserId: string,
  providerId: string,
  patch: ProviderNotificationsPatch
): Promise<{ updated: Record<string, string | null> } | null> {
  const prev = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { incidentChannel: true, oncallEmail: true, webhookUrl: true }
  });
  if (!prev) return null;
  const data: Record<string, string | null> = {};
  if (patch.incidentChannel !== undefined) data.incidentChannel = patch.incidentChannel;
  if (patch.oncallEmail !== undefined) data.oncallEmail = patch.oncallEmail;
  if (patch.webhookUrl !== undefined) data.webhookUrl = patch.webhookUrl;
  await prisma.provider.update({ where: { id: providerId }, data });
  await writeAuditFromCore({
    actorUserId,
    entityType: "provider",
    entityId: providerId,
    action: "provider.notifications_updated",
    previousValue: prev,
    newValue: data
  });
  return { updated: data };
}

// Local writeAudit reference (the SDK barrel can't be imported here due to
// circular-dep risk; pull straight from the primitive).
async function writeAuditFromCore(input: {
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const { writeAudit } = await import("../audit/write-audit");
  return writeAudit(input);
}

// ─── Public submit / verify flows ────────────────────────────────────────

/**
 * Return true if a user with this id still exists. Cheap projection
 * (only `id`) used by the contact-submit flow to verify the session
 * user before linking the contact row to it.
 */
export async function userExistsById(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  return !!u;
}

export type SubmitContactInput = {
  senderName: string;
  organisationName: string;
  email: string;
  topic: string;
  message: string;
  emailVerificationTokenHash: string;
  emailVerificationExpiry: Date;
  linkedUserId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export type SubmitContactResult = {
  id: string;
  linkedUserId: string | null;
};

/**
 * Persist a public contact submission. If `linkedUserId` is provided and
 * the FK fails (P2003 — stale session?), retries once without the link so
 * anonymous submission succeeds even when the session resolution races.
 *
 * Throws prisma errors for the caller to translate to HTTP responses
 * (P1000 / P2021 / P1001 each have specific user-facing messages).
 */
export async function submitContactRecord(
  input: SubmitContactInput
): Promise<SubmitContactResult> {
  // Lazy-load Prisma error class to keep the SDK barrel happy.
  const { Prisma: PrismaNs } = await import("../../generated/prisma");
  const createData = {
    senderName: input.senderName,
    organisationName: input.organisationName,
    email: input.email,
    topic: input.topic,
    message: input.message,
    emailVerified: false,
    emailVerificationToken: input.emailVerificationTokenHash,
    emailVerificationExpiry: input.emailVerificationExpiry,
    linkedUserId: input.linkedUserId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  };
  try {
    const row = await prisma.contact.create({ data: createData });
    return { id: row.id, linkedUserId: row.linkedUserId };
  } catch (first) {
    const code = (first as { code?: string }).code;
    if (
      input.linkedUserId &&
      code === "P2003" &&
      first instanceof PrismaNs.PrismaClientKnownRequestError
    ) {
      const row = await prisma.contact.create({
        data: { ...createData, linkedUserId: null }
      });
      return { id: row.id, linkedUserId: row.linkedUserId };
    }
    throw first;
  }
}

export type VerifyContactTokenResult =
  | { ok: true; email: string; alreadyVerified?: boolean }
  | { ok: false; reason: "expired_or_invalid" };

/**
 * Consume a contact-verification token atomically: looks up by hash,
 * marks the row verified, clears the token, and writes the audit row
 * inside a single `prisma.$transaction([...])`.
 *
 * Returns `{ ok: true, alreadyVerified: true }` when the token matches a
 * row that's already verified (idempotent).
 */
export async function verifyContactSubmissionToken(
  hashedToken: string
): Promise<VerifyContactTokenResult> {
  const contact = await prisma.contact.findFirst({
    where: { emailVerificationToken: hashedToken }
  });
  if (
    !contact ||
    !contact.emailVerificationExpiry ||
    contact.emailVerificationExpiry < new Date()
  ) {
    return { ok: false, reason: "expired_or_invalid" };
  }
  if (contact.emailVerified) {
    return { ok: true, email: contact.email, alreadyVerified: true };
  }
  await prisma.$transaction([
    prisma.contact.update({
      where: { id: contact.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null
      }
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: contact.linkedUserId,
        entityType: "contact",
        entityId: contact.id,
        action: "contact.email_verified",
        previousValue: { emailVerified: false },
        newValue: { emailVerified: true, email: contact.email }
      }
    })
  ]);
  return { ok: true, email: contact.email };
}

/**
 * Existence check + slim projection for a resource targeted by a public
 * complaint report. Used by /api/public/report.
 */
export async function findResourceForPublicReport(
  resourceId: string
): Promise<{ id: string; title: string; airId: string | null } | null> {
  const r = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, title: true, airId: true }
  });
  return r ?? null;
}

export type CreatePublicComplaintInput = {
  targetResourceId: string;
  complaintTypeId: string;
  severityId: string;
  statusId: string;
  complainantEmail: string;
  description: string;
};

/**
 * Create a public-facing complaint row. The caller is /api/public/report;
 * it resolves the ref-table ids upstream and passes them in so this
 * helper stays simple. The route writes its own audit row afterwards
 * (with the original modal reason) so reviewers see precisely which
 * option the reporter picked.
 */
export async function createPublicComplaint(
  input: CreatePublicComplaintInput
): Promise<{ id: string }> {
  const row = await prisma.complaint.create({
    data: {
      targetResourceId: input.targetResourceId,
      complaintTypeId: input.complaintTypeId,
      severityId: input.severityId,
      statusId: input.statusId,
      complainantEmail: input.complainantEmail,
      description: input.description
    }
  });
  return { id: row.id };
}

// ─── Public complaints route helpers ─────────────────────────────────────

export async function findResourceByAirId(
  airId: string
): Promise<{ id: string } | null> {
  return prisma.resource.findUnique({
    where: { airId },
    select: { id: true }
  });
}

export async function findProviderBySlugForComplaint(
  slug: string
): Promise<{ id: string } | null> {
  return prisma.provider.findUnique({
    where: { slug },
    select: { id: true }
  });
}

export async function findComplaintSeverityByCode(
  code: string
): Promise<{ id: string } | null> {
  return prisma.complaintSeverityType.findUnique({
    where: { code },
    select: { id: true }
  });
}

export type CreatePublicComplaintRichInput = {
  targetResourceId: string | null;
  targetProviderId: string | null;
  complaintTypeId: string;
  severityId: string;
  statusId: string;
  complainantName: string | null;
  complainantEmail: string | null;
  description: string;
};

export async function createPublicComplaintRich(
  input: CreatePublicComplaintRichInput
): Promise<{ id: string; complainantEmail: string | null }> {
  const created = await prisma.complaint.create({
    data: input
  });
  return { id: created.id, complainantEmail: created.complainantEmail };
}

export async function loadResourceTitleById(
  id: string
): Promise<{ title: string } | null> {
  return prisma.resource.findUnique({
    where: { id },
    select: { title: true }
  });
}

export async function loadProviderSummaryById(
  id: string
): Promise<{ displayName: string; slug: string } | null> {
  return prisma.provider.findUnique({
    where: { id },
    select: { displayName: true, slug: true }
  });
}

// ─── Public jurisdictions catalogue (nested type+parent joins) ──────────

export type PublicJurisdictionRow = {
  code: string;
  name: string;
  type: { code: string; name: string } | null;
  parent: { code: string; name: string } | null;
};

/**
 * Public jurisdictions list — exposed at GET /api/jurisdictions. Unlike
 * the flat `listReferenceTable("jurisdiction")` catalog, this surface
 * includes nested type + parent joins per AIR-SPEC §8 jurisdictional
 * taxonomy.
 */
export async function loadPublicJurisdictionsList(): Promise<PublicJurisdictionRow[]> {
  const rows = await prisma.jurisdiction.findMany({
    where: { active: true },
    select: {
      code: true,
      name: true,
      type: { select: { code: true, name: true } },
      parent: { select: { code: true, name: true } }
    },
    orderBy: [{ type: { sortOrder: "asc" } }, { code: "asc" }]
  });
  return rows.map((j) => ({
    code: j.code,
    name: j.name,
    type: j.type ? { code: j.type.code, name: j.type.name } : null,
    parent: j.parent ? { code: j.parent.code, name: j.parent.name } : null
  }));
}

// ─── Branding singleton ─────────────────────────────────────────────────

export type BrandingRow = {
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
  jurisdictionDisplayName: string | null;
  privacyDataProtectionAct: string | null;
  openSourceRepoUrl: string | null;
};

const BRANDING_SINGLETON_ID = "default";

/**
 * Read the site-branding singleton. Returns null if the row is missing or
 * the DB is unreachable — callers fall back to env / defaults so the
 * public site renders even on a config issue.
 */
export async function loadBrandingSingleton(): Promise<BrandingRow | null> {
  try {
    return await prisma.siteBranding.findUnique({
      where: { id: BRANDING_SINGLETON_ID },
      select: {
        registryName: true,
        logoUrl: true,
        copyrightLine: true,
        buildLine: true,
        heroEyebrowText: true,
        heroEyebrowIconUrl: true,
        operatorName: true,
        operatorContactEmail: true,
        operatorOfficeName: true,
        operatorOfficeAddress: true,
        operatorContactHours: true,
        jurisdictionDisplayName: true,
        privacyDataProtectionAct: true,
        openSourceRepoUrl: true
      }
    });
  } catch {
    return null;
  }
}

// ─── Authenticated /portal/* (logged-in user's own view) ────────────────

export type PortalHomeView = {
  organisationName: string | null;
  verifiedContacts: Array<{
    id: string;
    topic: string;
    message: string;
    senderName: string;
    organisationName: string | null;
    createdAt: string;
  }>;
};

/**
 * Data for the authenticated /portal home page — the user's own profile +
 * any contact submissions they verified before signing in.
 */
export async function loadPortalHome(userId: string): Promise<PortalHomeView> {
  const [profile, verifiedContacts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { organisationName: true }
    }),
    prisma.contact.findMany({
      where: { linkedUserId: userId, emailVerified: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        topic: true,
        message: true,
        senderName: true,
        organisationName: true,
        createdAt: true
      }
    })
  ]);
  return {
    organisationName: profile?.organisationName ?? null,
    verifiedContacts: verifiedContacts.map((c) => ({
      id: c.id,
      topic: c.topic,
      message: c.message,
      senderName: c.senderName,
      organisationName: c.organisationName,
      createdAt: c.createdAt.toISOString()
    }))
  };
}

export type PortalResourceListView = {
  resources: Array<{
    id: string;
    slug: string;
    title: string;
    airId: string | null;
    summary: string | null;
    lifecycleCode: string;
    lifecycleName: string;
    resourceTypeCode: string;
    updatedAt: string;
  }>;
  /** Map of lifecycleCode → count for the actor's full catalogue (unfiltered). */
  countsByLifecycle: Record<string, number>;
};

/**
 * The /portal/resources list — the actor's own resources optionally filtered
 * by lifecycle, plus the lifecycle-bucket counts for tabs.
 */
export async function loadPortalResourceList(
  providerId: string,
  filter: string | null = null
): Promise<PortalResourceListView> {
  const [resources, counts, statusRows] = await Promise.all([
    prisma.resource.findMany({
      where: {
        providerId,
        ...(filter ? { lifecycleStatus: { code: filter } } : {})
      },
      orderBy: { updatedAt: "desc" },
      include: {
        lifecycleStatus: { select: { code: true, name: true } },
        resourceType: { select: { code: true } }
      }
    }),
    prisma.resource.groupBy({
      by: ["lifecycleStatusId"],
      where: { providerId },
      _count: true
    }),
    prisma.lifecycleStatus.findMany({
      select: { id: true, code: true }
    })
  ]);
  const idToCode = new Map(statusRows.map((s) => [s.id, s.code] as const));
  const countsByLifecycle: Record<string, number> = {};
  for (const c of counts) {
    const code = idToCode.get(c.lifecycleStatusId) ?? c.lifecycleStatusId;
    countsByLifecycle[code] = c._count;
  }
  return {
    resources: resources.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      airId: r.airId,
      summary: r.shortDescription ?? null,
      lifecycleCode: r.lifecycleStatus.code,
      lifecycleName: r.lifecycleStatus.name,
      resourceTypeCode: r.resourceType.code,
      updatedAt: r.updatedAt.toISOString().slice(0, 10)
    })),
    countsByLifecycle
  };
}

export type PortalResourceOwnerView = {
  id: string;
  slug: string;
  title: string;
  airId: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  lifecycleCode: string;
  canEdit: boolean;
  canSubmit: boolean;
};

/**
 * One of the actor's resources by id, with a thin view used by the
 * `/portal/resources/[id]` page. Returns null when the id doesn't belong
 * to the actor (404 the caller).
 */
export async function loadPortalResourceForOwner(
  id: string,
  providerId: string
): Promise<PortalResourceOwnerView | null> {
  const r = await prisma.resource.findFirst({
    where: { id, providerId },
    include: { lifecycleStatus: { select: { code: true } } }
  });
  if (!r) return null;
  const code = r.lifecycleStatus.code;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    airId: r.airId,
    shortDescription: r.shortDescription,
    longDescription: r.longDescription,
    lifecycleCode: code,
    canEdit: code === "draft" || code === "needs_update",
    canSubmit: code === "draft" || code === "needs_update"
  };
}

// ─── Provider portal: detail/edit pages ─────────────────────────────────

/**
 * The provider's own profile record for the settings page. Returns null if
 * the provider isn't found (the page renders an error).
 *
 * Returns a rich Prisma-row shape (with includes) because the settings form
 * binds many scalar fields; a thin projection would require listing every
 * field. The caller is the provider settings page only.
 */
export async function loadProviderForSettings(providerId: string) {
  return prisma.provider.findUnique({
    where: { id: providerId },
    include: {
      type: { select: { code: true } },
      homeJurisdiction: { select: { code: true } }
    }
  });
}

/**
 * One of the provider's resources by id, with the deep include shape the
 * /provider/resources/[id]/edit form needs. Returns null if not the actor's.
 *
 * Returns the rich Prisma-row shape because the edit form binds dozens of
 * fields across many relations; a flat projection here would require
 * exhaustively listing every scalar. Acceptable boundary trade-off until
 * the edit-form contract stabilises.
 */
export async function loadProviderResourceForEdit(
  id: string,
  providerId: string
) {
  return prisma.resource.findFirst({
    where: { id, providerId },
    include: {
      resourceType: { select: { code: true, name: true } },
      provider: { select: { slug: true, displayName: true } },
      primaryJurisdiction: { select: { code: true, name: true } },
      lifecycleStatus: { select: { code: true, name: true } },
      riskLevel: { select: { code: true } },
      resourceBases: { include: { sovereigntyBasis: { select: { code: true } } } },
      resourceLanguages: { include: { language: { select: { code: true } } } },
      resourceSectors: { include: { sector: { select: { code: true } } } },
      evidence: {
        include: {
          sovereigntyBasis: { select: { code: true } },
          evidenceType: { select: { code: true } }
        },
        orderBy: { createdAt: "asc" }
      },
      endpoints: {
        include: {
          protocol: { select: { code: true, name: true } },
          authMethod: { select: { code: true, name: true } },
          accessModel: { select: { code: true, name: true } }
        },
        orderBy: { primary: "desc" }
      }
    }
  });
}

// ─── Settings + analytics pages ──────────────────────────────────────────

export type VerifierSettingsStats = {
  /** Reviews this user decided in the last 30 days. */
  decidedLast30Days: number;
  /** Queue depth cross-provider. */
  queued: number;
  /** Queued reviews where the reviewer would face a §7 conflict. */
  conflicts: number;
};

/**
 * Verifier settings page stats. `providerId` is the actor's provider; pass
 * null for reviewers who aren't linked to a provider (no conflict counts).
 */
export async function loadVerifierSettingsStats(
  reviewerId: string,
  opts: { providerId?: string | null } = {}
): Promise<VerifierSettingsStats> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [decidedLast30Days, queued, conflicts] = await Promise.all([
    prisma.review.count({
      where: {
        reviewerId,
        status: { code: "decided" },
        completedAt: { gte: thirtyDaysAgo }
      }
    }),
    prisma.review.count({
      where: { status: { code: { in: ["open", "in_review"] } } }
    }),
    opts.providerId
      ? prisma.review.count({
          where: {
            status: { code: { in: ["open", "in_review"] } },
            resource: { providerId: opts.providerId }
          }
        })
      : Promise.resolve(0)
  ]);
  return { decidedLast30Days, queued, conflicts };
}

export type SovereignSettingsView = {
  jurisdiction: {
    code: string;
    name: string;
    typeCode: string | null;
    typeName: string | null;
  } | null;
  providerCount: number;
  listedResourceCount: number;
};

/**
 * Sovereign settings page — jurisdiction record + scoped totals.
 */
export async function loadSovereignSettingsView(
  jurisdictionCode: string
): Promise<SovereignSettingsView> {
  const [j, providerCount, listedResourceCount] = await Promise.all([
    prisma.jurisdiction.findUnique({
      where: { code: jurisdictionCode },
      include: { type: { select: { code: true, name: true } } }
    }),
    prisma.provider.count({ where: { homeJurisdiction: { code: jurisdictionCode } } }),
    prisma.resource.count({
      where: {
        primaryJurisdiction: { code: jurisdictionCode },
        lifecycleStatus: { code: "listed" }
      }
    })
  ]);
  return {
    jurisdiction: j
      ? {
          code: j.code,
          name: j.name,
          typeCode: j.type?.code ?? null,
          typeName: j.type?.name ?? null
        }
      : null,
    providerCount,
    listedResourceCount
  };
}

export type SovereignPoliciesView = {
  /** sovereigntyBasisId → usage count among resources in the jurisdiction. */
  basisUsage: Map<string, number>;
  officialAuthorities: Array<{
    id: string;
    name: string;
    typeName: string;
    domainArea: string;
    websiteUrl: string | null;
    authorisationCount: number;
  }>;
  sovereigntyEvidenceCount: number;
};

/**
 * Sovereign policies page — usage of each sovereignty basis + official
 * authorities + evidence rollup. All scoped to the jurisdiction.
 */
export async function loadSovereignPoliciesView(
  jurisdictionCode: string
): Promise<SovereignPoliciesView> {
  const [basesUsageRaw, officialAuthoritiesRaw, sovereigntyEvidenceCount] =
    await Promise.all([
      prisma.resourceSovereigntyBasis.groupBy({
        by: ["sovereigntyBasisId"],
        where: { resource: { primaryJurisdiction: { code: jurisdictionCode } } },
        _count: { _all: true }
      }),
      prisma.officialAuthority.findMany({
        where: {
          active: true,
          jurisdiction: { code: jurisdictionCode }
        },
        include: {
          type: { select: { name: true } },
          _count: { select: { authorisations: true } }
        },
        orderBy: { name: "asc" }
      }),
      prisma.sovereigntyEvidence.count({
        where: { resource: { primaryJurisdiction: { code: jurisdictionCode } } }
      })
    ]);
  return {
    basisUsage: new Map(basesUsageRaw.map((g) => [g.sovereigntyBasisId, g._count._all] as const)),
    officialAuthorities: officialAuthoritiesRaw.map((a) => ({
      id: a.id,
      name: a.name,
      typeName: a.type.name,
      domainArea: a.domainArea,
      websiteUrl: a.websiteUrl,
      authorisationCount: a._count.authorisations
    })),
    sovereigntyEvidenceCount
  };
}

export type ProviderAnalyticsView = {
  /** Total resources owned by the provider (all lifecycles). */
  resourceCount: number;
  /** Lifecycle-code → count of provider's resources. */
  lifecycle: Record<string, number>;
  /** resourceTypeId → count of listed resources. */
  listingByTypeId: Array<{ resourceTypeId: string; count: number }>;
  /** Reviews of provider's resources decided in last 30 days. */
  decisionsRecent: number;
  /** Complaints filed in last 30 days targeting provider or its resources. */
  complaintsRecent: number;
};

/**
 * Provider analytics — 30-day catalogue+governance signals.
 */
export async function loadProviderAnalytics(
  providerId: string
): Promise<ProviderAnalyticsView> {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [resources, decisionsRecent, complaintsRecent, listingByKind] =
    await Promise.all([
      prisma.resource.findMany({
        where: { providerId },
        include: {
          resourceType: { select: { code: true } },
          lifecycleStatus: { select: { code: true } }
        }
      }),
      prisma.review.count({
        where: {
          resource: { providerId },
          completedAt: { gte: since30d },
          status: { code: "decided" }
        }
      }),
      prisma.complaint.count({
        where: {
          OR: [{ targetProviderId: providerId }, { targetResource: { providerId } }],
          createdAt: { gte: since30d }
        }
      }),
      prisma.resource.groupBy({
        by: ["resourceTypeId"],
        where: { providerId, lifecycleStatus: { code: "listed" } },
        _count: { _all: true }
      })
    ]);
  const lifecycle = resources.reduce<Record<string, number>>((acc, r) => {
    acc[r.lifecycleStatus.code] = (acc[r.lifecycleStatus.code] ?? 0) + 1;
    return acc;
  }, {});
  return {
    resourceCount: resources.length,
    lifecycle,
    listingByTypeId: listingByKind.map((g) => ({
      resourceTypeId: g.resourceTypeId,
      count: g._count._all
    })),
    decisionsRecent,
    complaintsRecent
  };
}

// ─── Admin: detail pages + shared filter helpers ─────────────────────

export type ActiveProviderForFilter = {
  slug: string;
  displayName: string;
};

/**
 * Active (non-admin-suspended) providers used to populate filter dropdowns
 * across admin/users, admin/resources, admin/resources/[id]/edit.
 */
export async function loadActiveProvidersForFilter(): Promise<ActiveProviderForFilter[]> {
  const rows = await prisma.provider.findMany({
    where: { adminSuspended: false },
    orderBy: { displayName: "asc" },
    select: { slug: true, displayName: true }
  });
  return rows.map((p) => ({ slug: p.slug, displayName: p.displayName }));
}

export type AdminBrandingView = {
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
  jurisdictionDisplayName: string | null;
  privacyDataProtectionAct: string | null;
  openSourceRepoUrl: string | null;
};

/**
 * The site branding singleton row, or null when the deployment hasn't
 * overridden anything yet. /admin/branding renders a form on top of this.
 */
export async function loadAdminBrandingForm(
  singletonId: string
): Promise<AdminBrandingView | null> {
  const row = await prisma.siteBranding.findUnique({
    where: { id: singletonId }
  });
  if (!row) return null;
  return {
    registryName: row.registryName,
    logoUrl: row.logoUrl,
    copyrightLine: row.copyrightLine,
    buildLine: row.buildLine,
    heroEyebrowText: row.heroEyebrowText,
    heroEyebrowIconUrl: row.heroEyebrowIconUrl,
    operatorName: row.operatorName,
    operatorContactEmail: row.operatorContactEmail,
    operatorOfficeName: row.operatorOfficeName,
    operatorOfficeAddress: row.operatorOfficeAddress,
    operatorContactHours: row.operatorContactHours,
    jurisdictionDisplayName: row.jurisdictionDisplayName,
    privacyDataProtectionAct: row.privacyDataProtectionAct,
    openSourceRepoUrl: row.openSourceRepoUrl
  };
}

/**
 * Reviews currently queued (open / in_review) with provider/resource joins
 * for the /admin/reviews queue. Rich return — pages bind many fields.
 */
export async function loadAdminReviewQueue() {
  return prisma.review.findMany({
    where: {
      resourceId: { not: null },
      status: { code: { in: ["open", "in_review"] } }
    },
    orderBy: { createdAt: "asc" },
    include: {
      status: true,
      resource: {
        include: {
          lifecycleStatus: true,
          provider: { select: { slug: true, displayName: true } },
          resourceType: { select: { code: true } }
        }
      }
    }
  });
}

/**
 * One review by id with the deep include the /admin/reviews/[id] decide
 * page needs.
 */
export async function loadAdminReviewForDecide(id: string) {
  return prisma.review.findUnique({
    where: { id },
    include: {
      status: { select: { code: true, name: true } },
      reviewType: { select: { code: true, name: true } },
      resource: {
        include: {
          lifecycleStatus: { select: { code: true, name: true } },
          provider: { select: { slug: true, displayName: true } },
          resourceType: { select: { code: true, name: true } }
        }
      },
      provider: { select: { slug: true, displayName: true } },
      reviewer: { select: { name: true, email: true } },
      checklistItems: true
    }
  });
}

/**
 * One contact submission by id for /admin/contacts/[id].
 */
export async function loadAdminContactDetail(id: string) {
  return prisma.contact.findUnique({
    where: { id },
    include: {
      linkedUser: { select: { id: true, name: true, email: true } }
    }
  });
}

export type AdminProviderDetailProvider = Prisma.ProviderGetPayload<{
  include: {
    type: { select: { code: true; name: true } };
    status: { select: { code: true; name: true } };
    homeJurisdiction: { select: { code: true; name: true } };
    _count: { select: { resources: true; users: true } };
  };
}>;

export type AdminProviderDetailTrustSignal = Prisma.TrustSignalGetPayload<{
  include: {
    kind: { select: { code: true; name: true } };
    status: { select: { code: true; name: true } };
    decidedBy: { select: { name: true; email: true } };
  };
}>;

export type AdminProviderDetail = {
  provider: AdminProviderDetailProvider | null;
  recentTrustSignals: AdminProviderDetailTrustSignal[];
};

/**
 * Provider record + recent trust-signal feed for /admin/providers/[id].
 */
export async function loadAdminProviderDetail(id: string): Promise<AdminProviderDetail> {
  const [provider, recentTrustSignals] = await Promise.all([
    prisma.provider.findUnique({
      where: { id },
      include: {
        type: { select: { code: true, name: true } },
        status: { select: { code: true, name: true } },
        homeJurisdiction: { select: { code: true, name: true } },
        _count: { select: { resources: true, users: true } }
      }
    }),
    prisma.trustSignal.findMany({
      where: { targetProviderId: id },
      include: {
        kind: { select: { code: true, name: true } },
        status: { select: { code: true, name: true } },
        decidedBy: { select: { name: true, email: true } }
      },
      orderBy: { decidedAt: "desc" },
      take: 50
    })
  ]);
  return { provider, recentTrustSignals };
}

/**
 * Resource + active-provider list for /admin/resources/[id]/edit.
 */
export async function loadAdminResourceForEdit(id: string) {
  const [resource, providers] = await Promise.all([
    prisma.resource.findUnique({
      where: { id },
      include: {
        resourceType: { select: { code: true, name: true } },
        provider: { select: { slug: true, displayName: true } },
        primaryJurisdiction: { select: { code: true, name: true } },
        lifecycleStatus: { select: { code: true, name: true } },
        riskLevel: { select: { code: true, name: true } },
        resourceBases: {
          include: { sovereigntyBasis: { select: { code: true, name: true } } }
        },
        resourceLanguages: { include: { language: { select: { code: true } } } },
        resourceSectors: { include: { sector: { select: { code: true } } } },
        listingOrigin: { select: { code: true, name: true } },
        evidence: {
          include: {
            sovereigntyBasis: { select: { code: true } },
            evidenceType: { select: { code: true } }
          },
          orderBy: { createdAt: "asc" }
        },
        endpoints: {
          include: {
            protocol: { select: { code: true, name: true } },
            authMethod: { select: { code: true, name: true } },
            accessModel: { select: { code: true, name: true } }
          },
          orderBy: { primary: "desc" }
        }
      }
    }),
    prisma.provider.findMany({
      where: { adminSuspended: false },
      orderBy: { displayName: "asc" },
      select: { slug: true, displayName: true }
    })
  ]);
  return { resource, providers };
}

/**
 * Complaint detail + assignee-candidates list (admin OR reviewer, by
 * primary role or by extra UserRoleAssignment) used by
 * /admin/complaints/[id]'s assignee dropdown.
 */
export async function loadAdminComplaintDetail(id: string) {
  const [complaint, assigneeCandidates] = await Promise.all([
    prisma.complaint.findUnique({
      where: { id },
      include: {
        complaintType: { select: { code: true, name: true } },
        severity: { select: { code: true, name: true } },
        status: { select: { id: true, code: true, name: true } },
        targetResource: {
          select: {
            slug: true,
            title: true,
            provider: { select: { displayName: true } }
          }
        },
        targetProvider: { select: { slug: true, displayName: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        enforcementActions: {
          include: {
            actionType: { select: { name: true } },
            performedBy: { select: { name: true } }
          },
          orderBy: { performedAt: "desc" }
        }
      }
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { role: { code: { in: ["admin", "reviewer"] } } },
          {
            roleAssignments: {
              some: { role: { code: { in: ["admin", "reviewer"] } } }
            }
          }
        ]
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" }
    })
  ]);
  return { complaint, assigneeCandidates };
}

/**
 * Total provider count for /admin/settings.
 */
export async function loadAdminSettingsProviderCount(): Promise<number> {
  return prisma.provider.count();
}

// ─── Admin server pages ───────────────────────────────────────────────

export type AdminDashboardStats = {
  resourceCount: number;
  listedCount: number;
  providerCount: number;
  verifiedProviderCount: number;
  userCount: number;
  openReviewCount: number;
  auditCount: number;
  openComplaintCount: number;
  /** Open complaints assigned to the current admin. */
  myOpenComplaints: number;
};

/**
 * Admin dashboard counts. `actorUserId` is the current admin's id, used for
 * the "open complaints assigned to me" count.
 */
export async function loadAdminDashboardStats(
  actorUserId: string | null
): Promise<AdminDashboardStats> {
  const [
    resourceCount,
    listedCount,
    providerCount,
    verifiedProviderCount,
    userCount,
    openReviewCount,
    auditCount,
    openComplaintCount,
    myOpenComplaints
  ] = await Promise.all([
    prisma.resource.count(),
    prisma.resource.count({ where: { lifecycleStatus: { code: "listed" } } }),
    prisma.provider.count(),
    prisma.provider.count({
      where: {
        OR: [
          { status: { code: "verified" } },
          { status: { code: "official_provider" } }
        ]
      }
    }),
    prisma.user.count(),
    prisma.review.count({ where: { status: { code: { in: ["open", "in_review"] } } } }),
    prisma.auditLog.count(),
    prisma.complaint.count({
      where: { status: { code: { in: ["open", "investigating"] } } }
    }),
    actorUserId
      ? prisma.complaint.count({
          where: {
            assignedToId: actorUserId,
            status: { code: { in: ["open", "investigating"] } }
          }
        })
      : Promise.resolve(0)
  ]);
  return {
    resourceCount,
    listedCount,
    providerCount,
    verifiedProviderCount,
    userCount,
    openReviewCount,
    auditCount,
    openComplaintCount,
    myOpenComplaints
  };
}

export type AdminAuditLogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string | null;
  actorEmail: string | null;
  ts: string;
};

/**
 * Audit log feed for the admin audit page. Returns the most recent N rows.
 */
export async function loadAdminAuditLog(
  opts: { limit?: number } = {}
): Promise<AdminAuditLogRow[]> {
  const rows = await prisma.auditLog.findMany({
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 200
  });
  return rows.map((a) => ({
    id: a.id,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    actorName: a.actor?.name ?? null,
    actorEmail: a.actor?.email ?? null,
    ts: a.createdAt.toISOString().replace("T", " ").slice(0, 19)
  }));
}

export type AdminComplaintRow = {
  id: string;
  ts: string;
  type: string;
  severityCode: string;
  severityName: string;
  statusCode: string;
  statusName: string;
  target: string;
  targetSlug: string | null;
  targetProviderSlug: string | null;
  assignedToName: string | null;
  assignedToEmail: string | null;
  /** Description from the original complaint (free-form text). */
  description: string;
  /** Public name the complainant gave when submitting (may be empty). */
  complainantName: string | null;
  /** Public email if the complainant agreed to be contacted. */
  complainantEmail: string | null;
};

export type AdminComplaintsView = {
  rows: AdminComplaintRow[];
  /** statusCode → count across the full table (no filter), for filter chips. */
  countsByStatusCode: Record<string, number>;
  /** Open/investigating complaints assigned to the actor (for the "mine" tab badge). */
  myAssignedOpenCount: number;
};

export type AdminComplaintsFilter =
  | "all"
  | "mine"
  | "needs_action"
  | "open"
  | "investigating"
  | "resolved"
  | "rejected";

/**
 * Admin complaints feed.
 *   - "all"          → unfiltered
 *   - "mine"         → assigned to actor AND in open|investigating
 *   - "needs_action" → open OR investigating (any assignee)
 *   - others         → status.code equals the value
 */
export async function loadAdminComplaintsView(opts: {
  statusFilter: AdminComplaintsFilter;
  actorUserId: string | null;
}): Promise<AdminComplaintsView> {
  const where = (() => {
    if (opts.statusFilter === "all") return undefined;
    if (opts.statusFilter === "mine") {
      return {
        AND: [
          { status: { code: { in: ["open", "investigating"] } } },
          { assignedToId: opts.actorUserId ?? "__no_user__" }
        ]
      };
    }
    if (opts.statusFilter === "needs_action") {
      return { status: { code: { in: ["open", "investigating"] } } };
    }
    return { status: { code: opts.statusFilter } };
  })();
  const [rows, allCounts, statusRefs, myAssignedOpenCount] = await Promise.all([
    prisma.complaint.findMany({
      where,
      include: {
        complaintType: { select: { name: true } },
        severity: { select: { code: true, name: true } },
        status: { select: { code: true, name: true } },
        targetResource: {
          select: {
            slug: true,
            title: true,
            provider: { select: { displayName: true } }
          }
        },
        targetProvider: { select: { slug: true, displayName: true } },
        assignedTo: { select: { name: true, email: true } }
      },
      orderBy: [{ status: { sortOrder: "asc" } }, { createdAt: "desc" }],
      take: 500
    }),
    prisma.complaint.groupBy({
      by: ["statusId"],
      _count: { _all: true }
    }),
    prisma.complaintStatusType.findMany({ select: { id: true, code: true } }),
    opts.actorUserId
      ? prisma.complaint.count({
          where: {
            assignedToId: opts.actorUserId,
            status: { code: { in: ["open", "investigating"] } }
          }
        })
      : Promise.resolve(0)
  ]);
  const idToCode = new Map(statusRefs.map((s) => [s.id, s.code] as const));
  const countsByStatusCode: Record<string, number> = {};
  for (const r of allCounts) {
    const code = idToCode.get(r.statusId);
    if (code) countsByStatusCode[code] = r._count._all;
  }
  return {
    myAssignedOpenCount,
    rows: rows.map((c) => ({
      id: c.id,
      ts: c.submittedAt.toISOString().slice(0, 10),
      type: c.complaintType.name,
      severityCode: c.severity.code,
      severityName: c.severity.name,
      statusCode: c.status.code,
      statusName: c.status.name,
      target: c.targetResource
        ? `${c.targetResource.title} · ${c.targetResource.provider.displayName}`
        : c.targetProvider
          ? c.targetProvider.displayName
          : "-",
      targetSlug: c.targetResource?.slug ?? null,
      targetProviderSlug: c.targetProvider?.slug ?? null,
      assignedToName: c.assignedTo?.name ?? null,
      assignedToEmail: c.assignedTo?.email ?? null,
      description: c.description,
      complainantName: c.complainantName,
      complainantEmail: c.complainantEmail
    })),
    countsByStatusCode
  };
}

export type AdminContactRow = {
  id: string;
  ts: string;
  senderName: string;
  organisationName: string | null;
  email: string;
  topicCode: string;
  message: string;
  emailVerified: boolean;
  linkedUserName: string | null;
  linkedUserEmail: string | null;
};

export type AdminContactsView = {
  rows: AdminContactRow[];
  totalCount: number;
  verifiedCount: number;
  unverifiedCount: number;
};

/**
 * Admin contacts feed. `verifiedFilter` is one of "all" | "yes" | "no".
 */
export async function loadAdminContactsView(
  verifiedFilter: "all" | "yes" | "no"
): Promise<AdminContactsView> {
  const where =
    verifiedFilter === "all"
      ? undefined
      : { emailVerified: verifiedFilter === "yes" };
  const [rows, totalCount, verifiedCount] = await Promise.all([
    prisma.contact.findMany({
      where,
      select: {
        id: true,
        senderName: true,
        organisationName: true,
        email: true,
        topic: true,
        message: true,
        emailVerified: true,
        createdAt: true,
        linkedUser: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    }),
    prisma.contact.count(),
    prisma.contact.count({ where: { emailVerified: true } })
  ]);
  return {
    rows: rows.map((c) => ({
      id: c.id,
      ts: c.createdAt.toISOString().slice(0, 10),
      senderName: c.senderName,
      organisationName: c.organisationName,
      email: c.email,
      topicCode: c.topic,
      message: c.message,
      emailVerified: c.emailVerified,
      linkedUserName: c.linkedUser?.name ?? null,
      linkedUserEmail: c.linkedUser?.email ?? null
    })),
    totalCount,
    verifiedCount,
    unverifiedCount: totalCount - verifiedCount
  };
}

export type SovereignReportsSnapshot = {
  listedTotal: number;
  listedSince90d: number;
  deprecated: number;
  reviewsDecided90d: number;
  enforcementActions90d: number;
  providersTotal: number;
  providersOfficial: number;
};

/**
 * Sovereign reports — 90-day quarterly snapshot scoped to the jurisdiction.
 */
export async function loadSovereignReportsSnapshot(
  jurisdictionCode: string
): Promise<SovereignReportsSnapshot> {
  const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const where = { primaryJurisdiction: { code: jurisdictionCode } };
  const [
    listedTotal,
    listedSince90d,
    deprecated,
    reviewsDecided90d,
    enforcementActions90d,
    providersTotal,
    providersOfficial
  ] = await Promise.all([
    prisma.resource.count({
      where: { ...where, lifecycleStatus: { code: "listed" } }
    }),
    prisma.resource.count({
      where: {
        ...where,
        lifecycleStatus: { code: "listed" },
        listedAt: { gte: since90d }
      }
    }),
    prisma.resource.count({
      where: { ...where, lifecycleStatus: { code: "deprecated" } }
    }),
    prisma.review.count({
      where: {
        resource: where,
        status: { code: "decided" },
        completedAt: { gte: since90d }
      }
    }),
    prisma.enforcementAction.count({
      where: {
        OR: [
          { targetResource: { primaryJurisdiction: { code: jurisdictionCode } } },
          { targetProvider: { homeJurisdiction: { code: jurisdictionCode } } }
        ],
        performedAt: { gte: since90d }
      }
    }),
    prisma.provider.count({
      where: { homeJurisdiction: { code: jurisdictionCode } }
    }),
    prisma.provider.count({
      where: {
        homeJurisdiction: { code: jurisdictionCode },
        status: { code: "official_provider" }
      }
    })
  ]);
  return {
    listedTotal,
    listedSince90d,
    deprecated,
    reviewsDecided90d,
    enforcementActions90d,
    providersTotal,
    providersOfficial
  };
}

export type VerifierReportsSnapshot = {
  open: number;
  decided30: number;
  decided90: number;
  withdrawn90: number;
  /** Per-reviewType counts among reviews decided in last 90 days. */
  byTypeId: Array<{ reviewTypeId: string; count: number }>;
};

/**
 * Verifier reports — review activity aggregates over 30/90 day windows.
 */
export async function loadVerifierReportsSnapshot(): Promise<VerifierReportsSnapshot> {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const [open, decided30, decided90, withdrawn90, byType] = await Promise.all([
    prisma.review.count({ where: { status: { code: { in: ["open", "in_review"] } } } }),
    prisma.review.count({
      where: { status: { code: "decided" }, completedAt: { gte: since30d } }
    }),
    prisma.review.count({
      where: { status: { code: "decided" }, completedAt: { gte: since90d } }
    }),
    prisma.review.count({
      where: { status: { code: "withdrawn" }, completedAt: { gte: since90d } }
    }),
    prisma.review.groupBy({
      by: ["reviewTypeId"],
      where: { status: { code: "decided" }, completedAt: { gte: since90d } },
      _count: { _all: true }
    })
  ]);
  return {
    open,
    decided30,
    decided90,
    withdrawn90,
    byTypeId: byType.map((g) => ({ reviewTypeId: g.reviewTypeId, count: g._count._all }))
  };
}

// ─── Sovereign portal: list pages ────────────────────────────────────────

export type SovereignCatalogRow = {
  id: string;
  airId: string | null;
  slug: string;
  title: string;
  kind: string;
  provider: string;
  bases: string[];
  /** Display status from `deriveDisplayStatus`. */
  status: string;
  lifecycle: string;
};

/**
 * National catalogue — every resource anchored in the deployment's
 * jurisdiction. Used by /sovereign/catalog.
 */
export async function loadSovereignCatalog(
  jurisdictionCode: string
): Promise<SovereignCatalogRow[]> {
  const { deriveDisplayStatus } = await import("../discovery/serializers");
  const rows = await prisma.resource.findMany({
    where: { primaryJurisdiction: { code: jurisdictionCode } },
    include: {
      resourceType: { select: { code: true } },
      provider: { select: { displayName: true } },
      lifecycleStatus: true,
      trustSignals: { include: { kind: true, status: true } },
      resourceBases: {
        include: { sovereigntyBasis: { select: { code: true, name: true } } }
      }
    },
    orderBy: [{ lifecycleStatus: { sortOrder: "asc" } }, { title: "asc" }]
  });
  return rows.map((r) => ({
    id: r.id,
    airId: r.airId,
    slug: r.slug,
    title: r.title,
    kind: r.resourceType.code,
    provider: r.provider.displayName,
    bases: r.resourceBases.map((rb) => rb.sovereigntyBasis.name),
    status: deriveDisplayStatus({
      lifecycleStatus: r.lifecycleStatus,
      trustSignals: r.trustSignals
    }),
    lifecycle: r.lifecycleStatus.name
  }));
}

export type SovereignIncidentRow = {
  id: string;
  actionType: string;
  reason: string;
  publicNote: string | null;
  target: string;
  targetSlug: string | null;
  performedAt: string;
  performedBy: string;
};

/**
 * Enforcement actions within the sovereign jurisdiction. Used by
 * /sovereign/incidents.
 */
export async function loadSovereignIncidents(
  jurisdictionCode: string
): Promise<SovereignIncidentRow[]> {
  const rows = await prisma.enforcementAction.findMany({
    where: {
      OR: [
        { targetResource: { primaryJurisdiction: { code: jurisdictionCode } } },
        { targetProvider: { homeJurisdiction: { code: jurisdictionCode } } }
      ]
    },
    include: {
      actionType: { select: { code: true, name: true } },
      targetResource: {
        select: {
          slug: true,
          title: true,
          provider: { select: { displayName: true } }
        }
      },
      targetProvider: { select: { displayName: true, slug: true } },
      performedBy: { select: { name: true, email: true } }
    },
    orderBy: { performedAt: "desc" },
    take: 200
  });
  return rows.map((e) => ({
    id: e.id,
    actionType: e.actionType.name,
    reason: e.reason,
    publicNote: e.publicNote,
    target: e.targetResource
      ? `${e.targetResource.title} · ${e.targetResource.provider.displayName}`
      : e.targetProvider
        ? e.targetProvider.displayName
        : "-",
    targetSlug: e.targetResource?.slug ?? null,
    performedAt: e.performedAt.toISOString().slice(0, 16).replace("T", " "),
    performedBy: e.performedBy?.name ?? e.performedBy?.email ?? "-"
  }));
}

export type SovereignPartnerRow = {
  id: string;
  slug: string;
  displayName: string;
  kind: string;
  /** Raw status code; pages map to display label. */
  statusCode: string;
  resources: number;
  contact: string;
  website: string | null;
  joined: string;
};

/**
 * Providers anchored in the deployment's jurisdiction (the sovereign
 * partner registry). Used by /sovereign/partners.
 */
export async function loadSovereignPartners(
  jurisdictionCode: string
): Promise<SovereignPartnerRow[]> {
  const rows = await prisma.provider.findMany({
    where: { homeJurisdiction: { code: jurisdictionCode } },
    include: {
      type: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      _count: { select: { resources: true } }
    },
    orderBy: [{ status: { sortOrder: "asc" } }, { displayName: "asc" }],
    take: 200
  });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    displayName: p.displayName,
    kind: p.type.name,
    statusCode: p.status.code,
    resources: p._count.resources,
    contact: p.contactEmail,
    website: p.websiteUrl,
    joined: p.createdAt.toISOString().slice(0, 10)
  }));
}

export type SovereignRiskResourceRow = {
  id: string;
  slug: string;
  title: string;
  providerName: string;
  providerSlug: string;
  resourceTypeCode: string;
  riskCode: string;
  riskName: string;
  lifecycleCode: string;
};

/**
 * Resources anchored in the sovereign jurisdiction with their risk tier and
 * lifecycle. Used by /sovereign/risk to bucket into risk tiers + show a
 * drill-in list of high-risk rows.
 */
export async function loadSovereignResourcesForRisk(
  jurisdictionCode: string
): Promise<SovereignRiskResourceRow[]> {
  const rows = await prisma.resource.findMany({
    where: { primaryJurisdiction: { code: jurisdictionCode } },
    include: {
      provider: { select: { displayName: true, slug: true } },
      resourceType: { select: { code: true } },
      riskLevel: { select: { code: true, name: true } },
      lifecycleStatus: { select: { code: true } }
    },
    orderBy: { updatedAt: "desc" }
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    providerName: r.provider.displayName,
    providerSlug: r.provider.slug,
    resourceTypeCode: r.resourceType.code,
    riskCode: r.riskLevel.code,
    riskName: r.riskLevel.name,
    lifecycleCode: r.lifecycleStatus.code
  }));
}

export type SovereignSectorMembershipRow = {
  sectorId: string;
  resourceLifecycleCode: string;
  resourceTypeCode: string;
};

/**
 * Sector-membership rows for resources anchored in the sovereign
 * jurisdiction. Used by /sovereign/sectors to bucket per-sector counts by
 * lifecycle + resource kind.
 */
export async function loadSovereignSectorMemberships(
  jurisdictionCode: string
): Promise<SovereignSectorMembershipRow[]> {
  const rows = await prisma.resourceSector.findMany({
    where: { resource: { primaryJurisdiction: { code: jurisdictionCode } } },
    include: {
      resource: {
        select: {
          lifecycleStatus: { select: { code: true } },
          resourceType: { select: { code: true } }
        }
      }
    }
  });
  return rows.map((m) => ({
    sectorId: m.sectorId,
    resourceLifecycleCode: m.resource.lifecycleStatus.code,
    resourceTypeCode: m.resource.resourceType.code
  }));
}

export type SovereignTopologyProviderRow = {
  id: string;
  slug: string;
  displayName: string;
  typeCode: string;
  typeName: string;
  statusCode: string;
  statusName: string;
  resources: Array<{
    id: string;
    slug: string;
    title: string;
    resourceTypeCode: string;
    lifecycleCode: string;
    lifecycleName: string;
  }>;
};

/**
 * Provider→resources tree for the sovereign jurisdiction. Used by
 * /sovereign/topology to render the deployment-at-a-glance view.
 */
export async function loadSovereignTopology(
  jurisdictionCode: string
): Promise<SovereignTopologyProviderRow[]> {
  const providers = await prisma.provider.findMany({
    where: { homeJurisdiction: { code: jurisdictionCode } },
    include: {
      type: { select: { name: true, code: true } },
      status: { select: { name: true, code: true } },
      resources: {
        include: {
          resourceType: { select: { code: true } },
          lifecycleStatus: { select: { code: true, name: true } }
        },
        orderBy: { title: "asc" }
      }
    },
    orderBy: { displayName: "asc" }
  });
  return providers.map((p) => ({
    id: p.id,
    slug: p.slug,
    displayName: p.displayName,
    typeCode: p.type.code,
    typeName: p.type.name,
    statusCode: p.status.code,
    statusName: p.status.name,
    resources: p.resources.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      resourceTypeCode: r.resourceType.code,
      lifecycleCode: r.lifecycleStatus.code,
      lifecycleName: r.lifecycleStatus.name
    }))
  }));
}

// ─── Verifier portal: list pages ─────────────────────────────────────────

export type VerifierReviewRow = {
  id: string;
  resourceTitle: string;
  resourceSlug: string | null;
  provider: string;
  reviewType: string;
  /** Raw status code; pages map to display label. */
  statusCode: string;
  startedAt: string | null;
  createdAt: string;
};

/**
 * Reviews currently queued (open / in_review). Used by /verifier/queue.
 */
export async function loadVerifierQueue(): Promise<VerifierReviewRow[]> {
  const rows = await prisma.review.findMany({
    where: { status: { code: { in: ["open", "in_review"] } } },
    include: {
      reviewType: { select: { name: true } },
      status: { select: { code: true, name: true } },
      resource: {
        select: { slug: true, title: true, provider: { select: { displayName: true } } }
      },
      provider: { select: { displayName: true } }
    },
    orderBy: { createdAt: "asc" }
  });
  return rows.map((r) => ({
    id: r.id,
    resourceTitle: r.resource?.title ?? "(provider-scoped review)",
    resourceSlug: r.resource?.slug ?? null,
    provider:
      r.resource?.provider.displayName ?? r.provider?.displayName ?? "-",
    reviewType: r.reviewType.name,
    statusCode: r.status.code,
    startedAt: r.startedAt ? r.startedAt.toISOString().slice(0, 10) : null,
    createdAt: r.createdAt.toISOString().slice(0, 10)
  }));
}

export type VerifierDecidedRow = {
  id: string;
  resourceTitle: string;
  resourceSlug: string | null;
  provider: string;
  reviewType: string;
  /** Raw status code (decided | withdrawn); pages map to display label. */
  statusCode: string;
  decisionSummary: string;
  reviewer: string;
  completedAt: string | null;
};

/**
 * Decided/withdrawn reviews. Used by /verifier/decided.
 */
export async function loadVerifierDecided(opts: { limit?: number } = {}): Promise<VerifierDecidedRow[]> {
  const rows = await prisma.review.findMany({
    where: { status: { code: { in: ["decided", "withdrawn"] } } },
    include: {
      reviewType: { select: { name: true } },
      status: { select: { code: true, name: true } },
      resource: {
        select: { slug: true, title: true, provider: { select: { displayName: true } } }
      },
      provider: { select: { displayName: true } },
      reviewer: { select: { name: true, email: true } }
    },
    orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
    take: opts.limit ?? 200
  });
  return rows.map((r) => ({
    id: r.id,
    resourceTitle: r.resource?.title ?? "(provider-scoped review)",
    resourceSlug: r.resource?.slug ?? null,
    provider:
      r.resource?.provider.displayName ?? r.provider?.displayName ?? "-",
    reviewType: r.reviewType.name,
    statusCode: r.status.code,
    decisionSummary: r.decisionSummary?.trim() || "-",
    reviewer: r.reviewer?.name ?? r.reviewer?.email ?? "-",
    completedAt: r.completedAt ? r.completedAt.toISOString().slice(0, 10) : null
  }));
}

export type VerifierEvalRunRow = {
  id: string;
  reviewTypeName: string;
  resourceTitle: string | null;
  resourceSlug: string | null;
  providerName: string | null;
  decisionSummary: string;
  reviewer: string;
  completedAt: string | null;
};

/**
 * Recent reviews that carry a decision summary (the verifier's
 * eval-declaration proxy). Used by /verifier/runs.
 */
export async function loadVerifierEvalRuns(opts: { limit?: number } = {}): Promise<VerifierEvalRunRow[]> {
  const rows = await prisma.review.findMany({
    where: {
      status: { code: { in: ["decided", "withdrawn"] } },
      decisionSummary: { not: null }
    },
    include: {
      reviewType: { select: { name: true } },
      resource: {
        select: {
          slug: true,
          title: true,
          provider: { select: { displayName: true } }
        }
      },
      reviewer: { select: { name: true, email: true } }
    },
    orderBy: { completedAt: "desc" },
    take: opts.limit ?? 50
  });
  return rows.map((r) => ({
    id: r.id,
    reviewTypeName: r.reviewType.name,
    resourceTitle: r.resource?.title ?? null,
    resourceSlug: r.resource?.slug ?? null,
    providerName: r.resource?.provider.displayName ?? null,
    decisionSummary: r.decisionSummary?.trim() || "-",
    reviewer: r.reviewer?.name ?? r.reviewer?.email ?? "-",
    completedAt: r.completedAt ? r.completedAt.toISOString().slice(0, 10) : null
  }));
}

export type VerifierRedteamFindingRow = {
  id: string;
  type: string;
  severityCode: string;
  statusName: string;
  target: string;
  targetSlug: string | null;
  description: string;
  receivedAt: string;
};

/**
 * Safety/policy complaints against listed resources — the MVP red-team
 * proxy until a first-class RedTeamFinding model lands.
 * Used by /verifier/redteam.
 */
export async function loadVerifierRedteamFindings(): Promise<VerifierRedteamFindingRow[]> {
  const findings = await prisma.complaint.findMany({
    where: {
      complaintType: { code: { in: ["safety", "policy"] } },
      targetResource: {
        lifecycleStatus: { code: { in: ["listed", "deprecated", "needs_update"] } }
      }
    },
    include: {
      complaintType: { select: { code: true, name: true } },
      severity: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      targetResource: {
        select: {
          slug: true,
          title: true,
          provider: { select: { displayName: true } }
        }
      }
    },
    orderBy: [{ severity: { sortOrder: "desc" } }, { createdAt: "desc" }],
    take: 200
  });
  return findings.map((c) => ({
    id: c.id,
    type: c.complaintType.name,
    severityCode: c.severity.code,
    statusName: c.status.name,
    target: c.targetResource
      ? `${c.targetResource.title} · ${c.targetResource.provider.displayName}`
      : "-",
    targetSlug: c.targetResource?.slug ?? null,
    description: c.description,
    receivedAt: c.createdAt.toISOString().slice(0, 10)
  }));
}

export type VerifierBenchmarkRow = {
  tagId: string;
  tag: string;
  coverage: number;
};

/**
 * Tag-coverage aggregation across listed resources — the MVP benchmark-
 * corpus proxy. Used by /verifier/benchmarks.
 */
export async function loadVerifierBenchmarkCorpus(opts: { minCoverage?: number; limit?: number } = {}): Promise<VerifierBenchmarkRow[]> {
  const minCoverage = opts.minCoverage ?? 2;
  const limit = opts.limit ?? 60;
  const tagUsage = await prisma.resourceTag.groupBy({
    by: ["tagId"],
    where: {
      resource: {
        publicVisibility: true,
        lifecycleStatus: { code: { in: ["listed", "needs_update"] } }
      }
    },
    _count: { _all: true }
  });
  const tags = await prisma.tag.findMany({
    where: { id: { in: tagUsage.map((g) => g.tagId) } },
    select: { id: true, name: true }
  });
  const nameById = new Map(tags.map((t) => [t.id, t.name] as const));
  return tagUsage
    .map((g) => ({
      tagId: g.tagId,
      tag: nameById.get(g.tagId) ?? "-",
      coverage: g._count._all
    }))
    .filter((row) => row.coverage >= minCoverage)
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, limit);
}

/**
 * Verified contact submissions linked to a user under this provider.
 * Used by /provider/contact-requests.
 */
export async function loadMyContactRequests(
  providerId: string
): Promise<ProviderContactRequestRow[]> {
  const rows = await prisma.contact.findMany({
    where: {
      emailVerified: true,
      linkedUser: { providerId }
    },
    select: {
      id: true,
      senderName: true,
      organisationName: true,
      email: true,
      topic: true,
      message: true,
      createdAt: true,
      linkedUser: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return rows.map((c) => ({
    id: c.id,
    senderName: c.senderName,
    organisationName: c.organisationName,
    email: c.email,
    topic: c.topic,
    message: c.message,
    createdAt: c.createdAt.toISOString(),
    linkedUserName: c.linkedUser?.name ?? null,
    linkedUserEmail: c.linkedUser?.email ?? null
  }));
}

// ─── Portal: provider organisation profile ───────────────────────────────

export type UpdateProviderOrganisationInput = {
  displayName: string;
  slug: string;
  contactEmail: string;
  legalName: string | null;
  description: string | null;
  providerTypeId: string;
  jurisdictionId: string;
  unverifiedStatusId: string;
  /** Echoed back into the audit payload so the route's reference codes
   * remain readable in the audit log. */
  providerTypeCode: string;
  jurisdictionCode: string;
};

export type UpdateProviderOrganisationResult =
  | {
      ok: true;
      provider: { id: string; slug: string; displayName: string; contactEmail: string };
    }
  | { ok: false; code: "provider_not_found" | "slug_taken" };

/**
 * Apply the provider-portal "complete your organisation profile" update
 * inside a single transaction. Sets User.onboardingComplete=true and writes
 * the audit row with the before-snapshot.
 *
 * Reference rows (provider type, jurisdiction, unverified status) MUST be
 * resolved by the caller via the reference catalog service. This keeps the
 * service signature flat (no nested reference-code validation).
 */
export async function updateProviderOrganisation(
  actorUserId: string,
  providerId: string,
  input: UpdateProviderOrganisationInput
): Promise<UpdateProviderOrganisationResult> {
  const existing = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { slug: true }
  });
  if (!existing) return { ok: false, code: "provider_not_found" };

  if (input.slug !== existing.slug) {
    const clash = await prisma.provider.findUnique({ where: { slug: input.slug } });
    if (clash) return { ok: false, code: "slug_taken" };
  }

  const prev = await prisma.provider.findUnique({
    where: { id: providerId },
    select: {
      slug: true,
      displayName: true,
      contactEmail: true,
      homeJurisdictionId: true,
      typeId: true
    }
  });

  await prisma.$transaction([
    prisma.provider.update({
      where: { id: providerId },
      data: {
        slug: input.slug,
        displayName: input.displayName,
        contactEmail: input.contactEmail,
        legalName: input.legalName,
        description: input.description,
        typeId: input.providerTypeId,
        homeJurisdictionId: input.jurisdictionId,
        statusId: input.unverifiedStatusId
      }
    }),
    prisma.user.update({
      where: { id: actorUserId },
      data: { onboardingComplete: true }
    })
  ]);

  const updated = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
    select: { id: true, slug: true, displayName: true, contactEmail: true }
  });

  await writeAuditFromCore({
    actorUserId,
    entityType: "provider",
    entityId: providerId,
    action: "provider.organisation_profile_completed",
    previousValue: prev,
    newValue: {
      slug: input.slug,
      displayName: input.displayName,
      contactEmail: input.contactEmail,
      providerTypeCode: input.providerTypeCode,
      jurisdictionCode: input.jurisdictionCode,
      onboardingComplete: true
    }
  });

  return { ok: true, provider: updated };
}

// ─── Portal: provider workspace resources ────────────────────────────────

export type MyResourceListRow = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  type: string;
  lifecycle: string;
  lifecycleName: string;
  airId: string | null;
  updatedAt: string;
};

export type MyResourcesList = {
  resources: MyResourceListRow[];
  countsByLifecycle: Record<string, number>;
};

/**
 * Provider-workspace resource list, optionally filtered by lifecycle code.
 * Drives GET /api/portal/resources.
 */
export async function loadMyResourcesList(
  providerId: string,
  lifecycleCode?: string | null
): Promise<MyResourcesList> {
  const resources = await prisma.resource.findMany({
    where: {
      providerId,
      ...(lifecycleCode ? { lifecycleStatus: { code: lifecycleCode } } : {})
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      resourceType: { select: { code: true, name: true } },
      lifecycleStatus: { select: { code: true, name: true } }
    }
  });
  const counts: Record<string, number> = {};
  for (const r of resources) {
    counts[r.lifecycleStatus.code] = (counts[r.lifecycleStatus.code] ?? 0) + 1;
  }
  return {
    resources: resources.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      shortDescription: r.shortDescription,
      type: r.resourceType.code,
      lifecycle: r.lifecycleStatus.code,
      lifecycleName: r.lifecycleStatus.name,
      airId: r.airId,
      updatedAt: r.updatedAt.toISOString()
    })),
    countsByLifecycle: counts
  };
}

export type CreateMyResourceDraftInput = {
  resourceTypeCode: string;
  slug: string;
  title: string;
  shortDescription: string;
  /** Resolved reference rows from the reference catalog. */
  resourceTypeId: string;
  draftStatusId: string;
  listingLocalId: string;
  riskLowId: string;
  sovereigntyBasisId: string;
  protocolRestId: string;
  authApiKeyId: string;
  accessRegisteredId: string;
  endpointHealthUnknownId: string;
};

export type CreateMyResourceDraftResult =
  | {
      ok: true;
      resource: { id: string; slug: string; title: string };
    }
  | { ok: false; code: "slug_taken" | "provider_not_found" };

/**
 * Create a draft Resource for the provider's workspace inside a single
 * transaction. Also seeds one ResourceSovereigntyBasis row and one
 * primary ResourceEndpoint row.
 */
export async function createMyResourceDraft(
  actorUserId: string,
  providerId: string,
  input: CreateMyResourceDraftInput
): Promise<CreateMyResourceDraftResult> {
  const existingSlug = await prisma.resource.findUnique({
    where: { providerId_slug: { providerId, slug: input.slug } }
  });
  if (existingSlug) return { ok: false, code: "slug_taken" };

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { slug: true, homeJurisdictionId: true }
  });
  if (!provider) return { ok: false, code: "provider_not_found" };

  const resource = await prisma.$transaction(async (tx) => {
    const res = await tx.resource.create({
      data: {
        slug: input.slug,
        title: input.title,
        shortDescription: input.shortDescription,
        resourceTypeId: input.resourceTypeId,
        providerId,
        primaryJurisdictionId: provider.homeJurisdictionId,
        listingOriginId: input.listingLocalId,
        lifecycleStatusId: input.draftStatusId,
        riskLevelId: input.riskLowId,
        publicVisibility: false,
        airId: null
      }
    });

    await tx.resourceSovereigntyBasis.create({
      data: {
        resourceId: res.id,
        sovereigntyBasisId: input.sovereigntyBasisId,
        submittedById: actorUserId
      }
    });

    await tx.resourceEndpoint.create({
      data: {
        resourceId: res.id,
        protocolId: input.protocolRestId,
        endpointUrl: `https://${provider.slug}.example/api/${input.slug}`,
        authMethodId: input.authApiKeyId,
        accessModelId: input.accessRegisteredId,
        primary: true,
        active: true,
        lastCheckStatusId: input.endpointHealthUnknownId
      }
    });

    return res;
  });

  await writeAuditFromCore({
    actorUserId,
    entityType: "resource",
    entityId: resource.id,
    action: "resource.draft_created",
    newValue: { slug: input.slug, title: input.title, type: input.resourceTypeCode }
  });

  return {
    ok: true,
    resource: { id: resource.id, slug: resource.slug, title: resource.title }
  };
}

export type MyResourceEditView = {
  id: string;
  airId: string | null;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string | null;
  kindCode: string;
  kindName: string;
  providerSlug: string;
  providerName: string;
  jurisdictionCode: string;
  jurisdictionName: string;
  lifecycleCode: string;
  lifecycleName: string;
  riskCode: string;
  publicVisibility: boolean;
  license: string | null;
  versionLabel: string | null;
  versionNumber: string | null;
  latencyTier: string | null;
  accessUrl: string | null;
  sourceCodeUrl: string | null;
  documentationUrl: string | null;
  termsUrl: string | null;
  sovereigntyBasisCodes: string[];
  languageCodes: string[];
  sectorCodes: string[];
  evidence: Array<{
    id: string;
    evidenceTypeCode: string;
    sovereigntyBasisCode: string;
    title: string;
    description: string | null;
    referenceUrl: string | null;
    referenceIdentifier: string | null;
    issuingBody: string | null;
    publicVisibility: boolean;
  }>;
  endpoints: Array<{
    id: string;
    protocolCode: string;
    endpointUrl: string;
    documentationUrl: string | null;
    authMethodCode: string;
    accessModelCode: string;
    primary: boolean;
    active: boolean;
  }>;
};

/**
 * Read the actor's resource as the GET shape for the provider edit form.
 * Returns null when the resource doesn't exist or doesn't belong to the actor.
 */
export async function loadMyResourceForEdit(
  providerId: string,
  resourceId: string
): Promise<MyResourceEditView | null> {
  const r = await prisma.resource.findFirst({
    where: { id: resourceId, providerId },
    include: {
      resourceType: { select: { code: true, name: true } },
      provider: { select: { slug: true, displayName: true } },
      primaryJurisdiction: { select: { code: true, name: true } },
      lifecycleStatus: { select: { code: true, name: true } },
      riskLevel: { select: { code: true, name: true } },
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
  if (!r) return null;
  return {
    id: r.id,
    airId: r.airId,
    slug: r.slug,
    title: r.title,
    shortDescription: r.shortDescription,
    longDescription: r.longDescription,
    kindCode: r.resourceType.code,
    kindName: r.resourceType.name,
    providerSlug: r.provider.slug,
    providerName: r.provider.displayName,
    jurisdictionCode: r.primaryJurisdiction.code,
    jurisdictionName: r.primaryJurisdiction.name,
    lifecycleCode: r.lifecycleStatus.code,
    lifecycleName: r.lifecycleStatus.name,
    riskCode: r.riskLevel.code,
    publicVisibility: r.publicVisibility,
    license: r.license,
    versionLabel: r.versionLabel,
    versionNumber: r.versionNumber,
    latencyTier: r.latencyTier,
    accessUrl: r.accessUrl,
    sourceCodeUrl: r.sourceCodeUrl,
    documentationUrl: r.documentationUrl,
    termsUrl: r.termsUrl,
    sovereigntyBasisCodes: r.resourceBases.map((b) => b.sovereigntyBasis.code),
    languageCodes: r.resourceLanguages.map((l) => l.language.code),
    sectorCodes: r.resourceSectors.map((s) => s.sector.code),
    evidence: r.evidence.map((e) => ({
      id: e.id,
      evidenceTypeCode: e.evidenceType.code,
      sovereigntyBasisCode: e.sovereigntyBasis.code,
      title: e.title,
      description: e.description,
      referenceUrl: e.referenceUrl,
      referenceIdentifier: e.referenceIdentifier,
      issuingBody: e.issuingBody,
      publicVisibility: e.publicVisibility
    })),
    endpoints: r.endpoints.map((ep) => ({
      id: ep.id,
      protocolCode: ep.protocol.code,
      endpointUrl: ep.endpointUrl,
      documentationUrl: ep.documentationUrl,
      authMethodCode: ep.authMethod.code,
      accessModelCode: ep.accessModel.code,
      primary: ep.primary,
      active: ep.active
    }))
  };
}

export type MyResourceLifecycleSnapshot =
  | {
      found: true;
      target: {
        id: string;
        title: string;
        shortDescription: string;
        longDescription: string | null;
        versionLabel: string | null;
        versionNumber: string | null;
        latencyTier: string | null;
        license: string | null;
        accessUrl: string | null;
        documentationUrl: string | null;
        sourceCodeUrl: string | null;
        termsUrl: string | null;
        lifecycleCode: string;
      };
    }
  | { found: false };

/**
 * Pre-PATCH lookup: returns the editable fields + current lifecycle code,
 * scoped to the provider. Used by PATCH /api/portal/resources/:id to gate
 * lifecycle and build the before-snapshot.
 */
export async function loadMyResourceLifecycle(
  providerId: string,
  resourceId: string
): Promise<MyResourceLifecycleSnapshot> {
  const r = await prisma.resource.findFirst({
    where: { id: resourceId, providerId },
    select: {
      id: true,
      title: true,
      shortDescription: true,
      longDescription: true,
      versionLabel: true,
      versionNumber: true,
      latencyTier: true,
      license: true,
      accessUrl: true,
      documentationUrl: true,
      sourceCodeUrl: true,
      termsUrl: true,
      lifecycleStatus: { select: { code: true } }
    }
  });
  if (!r) return { found: false };
  return {
    found: true,
    target: {
      id: r.id,
      title: r.title,
      shortDescription: r.shortDescription,
      longDescription: r.longDescription,
      versionLabel: r.versionLabel,
      versionNumber: r.versionNumber,
      latencyTier: r.latencyTier,
      license: r.license,
      accessUrl: r.accessUrl,
      documentationUrl: r.documentationUrl,
      sourceCodeUrl: r.sourceCodeUrl,
      termsUrl: r.termsUrl,
      lifecycleCode: r.lifecycleStatus.code
    }
  };
}

export type ApplyMyResourceUpdateInput = {
  data: Record<string, unknown>;
  before: Record<string, unknown>;
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
};

/**
 * Apply a draft / needs_update resource patch as a single transaction:
 * top-level fields, plus N-N replacements for bases/languages/sectors and
 * full-replace for evidence + endpoints. Audit row is written outside the
 * transaction with the caller's before-snapshot.
 *
 * The caller resolves reference codes -> id rows via the reference catalog
 * service before calling this — the service deliberately doesn't reach
 * back into ref tables.
 */
export async function applyMyResourceUpdate(
  actorUserId: string,
  resourceId: string,
  input: ApplyMyResourceUpdateInput
): Promise<void> {
  const {
    data,
    before,
    basisRows,
    languageRows,
    sectorRows,
    evidenceResolved,
    endpointsResolved,
    basisCodes,
    languageCodes,
    sectorCodes
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
        await tx.sovereigntyEvidence.create({
          data: { ...row, resourceId }
        });
      }
    }
    if (endpointsResolved !== undefined) {
      await tx.resourceEndpoint.deleteMany({ where: { resourceId } });
      for (const row of endpointsResolved) {
        await tx.resourceEndpoint.create({
          data: { ...row, resourceId }
        });
      }
    }
  });

  await writeAuditFromCore({
    actorUserId,
    entityType: "resource",
    entityId: resourceId,
    action: "resource.draft_updated",
    previousValue: before,
    newValue: {
      ...data,
      ...(basisCodes !== undefined ? { sovereigntyBasisCodes: basisCodes } : {}),
      ...(languageCodes !== undefined ? { languageCodes } : {}),
      ...(sectorCodes !== undefined ? { sectorCodes } : {}),
      ...(evidenceResolved !== undefined ? { evidenceCount: evidenceResolved.length } : {}),
      ...(endpointsResolved !== undefined ? { endpointCount: endpointsResolved.length } : {})
    }
  });
}

export type MyResourceSubmitResult =
  | {
      ok: true;
      resourceId: string;
      reviewId: string;
      resourceTitle: string;
      providerContactEmail: string | null;
      providerLegalContactEmail: string | null;
    }
  | { ok: false; code: "not_found" | "invalid_lifecycle" };

/**
 * Apply the draft|needs_update → submitted lifecycle transition + create a
 * new open Review row in a single transaction. Audit is written with the
 * actor's id. Returns enough info for the route to compose the notification
 * email body.
 *
 * Reference rows for `submitted`, `open` review status, and the
 * sovereignty review type are resolved by the caller.
 */
export async function submitMyResourceForReview(
  actorUserId: string,
  providerId: string,
  resourceId: string,
  refs: {
    submittedLifecycleId: string;
    openReviewStatusId: string;
    sovereigntyReviewTypeId: string;
  }
): Promise<MyResourceSubmitResult> {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, providerId },
    include: {
      lifecycleStatus: { select: { code: true } },
      provider: { select: { contactEmail: true, legalContactEmail: true } }
    }
  });
  if (!resource) return { ok: false, code: "not_found" };
  const code = resource.lifecycleStatus.code;
  if (code !== "draft" && code !== "needs_update") {
    return { ok: false, code: "invalid_lifecycle" };
  }

  const review = await prisma.$transaction(async (tx) => {
    await tx.resource.update({
      where: { id: resourceId },
      data: {
        lifecycleStatusId: refs.submittedLifecycleId,
        submittedAt: new Date(),
        lastProviderUpdateAt: new Date()
      }
    });
    return tx.review.create({
      data: {
        resourceId,
        reviewTypeId: refs.sovereigntyReviewTypeId,
        statusId: refs.openReviewStatusId
      }
    });
  });

  await writeAuditFromCore({
    actorUserId,
    entityType: "resource",
    entityId: resourceId,
    action: "resource.submitted_for_review",
    newValue: { reviewId: review.id, lifecycle: "submitted" }
  });

  return {
    ok: true,
    resourceId,
    reviewId: review.id,
    resourceTitle: resource.title,
    providerContactEmail: resource.provider.contactEmail,
    providerLegalContactEmail: resource.provider.legalContactEmail
  };
}
