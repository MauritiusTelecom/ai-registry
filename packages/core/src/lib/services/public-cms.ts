/**
 * Public-portal CMS service layer.
 *
 * Read/write helpers for the editable content that powers @airegistry/public's
 * marketing surface: home-page FAQ, "How it works" steps, listing criteria
 * cards, the promo banner. Section components import the typed projections
 * (CmsFaqEntryView etc.); admin pages import the upsert/delete/reorder
 * mutators.
 *
 * Convention mirrors `branding.ts`: every read falls back to a built-in
 * default when the table is empty, so a fresh deploy renders identically to
 * the legacy hardcoded copy before an operator touches /admin/site/*.
 *
 * Every mutator audits through @airegistry/core/audit so /admin/audit shows
 * the change history. Mutators expect an `actorUserId` because all writes are
 * gated to /admin/site/* (admin-role only); reads are server-only but
 * unauthenticated-safe and may be called from public server components.
 */

import { prisma } from "../prisma";
import { writeAudit } from "../audit/write-audit";

// ─── Types (plain projections; no Prisma row types leak) ──────────────────

export type CmsFaqEntryView = {
  id: string;
  code: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export type CmsHowItWorksStepView = {
  id: string;
  code: string;
  title: string;
  description: string;
  stepNumber: number;
  highlight: boolean;
  sortOrder: number;
};

export type CmsListingCriterionView = {
  id: string;
  code: string;
  title: string;
  description: string;
  iconName: string | null;
  sortOrder: number;
};

export type CmsPromoBannerView = {
  enabled: boolean;
  heading: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

// ─── FAQ ──────────────────────────────────────────────────────────────────

export async function listActiveFaqEntries(): Promise<CmsFaqEntryView[]> {
  const rows = await prisma.cmsFaqEntry.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" }
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    question: r.question,
    answer: r.answer,
    sortOrder: r.sortOrder
  }));
}

/** Admin: full list including soft-deleted rows, ordered. */
export async function listAllFaqEntries(): Promise<
  Array<CmsFaqEntryView & { active: boolean; updatedAt: Date }>
> {
  const rows = await prisma.cmsFaqEntry.findMany({
    orderBy: { sortOrder: "asc" }
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    question: r.question,
    answer: r.answer,
    sortOrder: r.sortOrder,
    active: r.active,
    updatedAt: r.updatedAt
  }));
}

export async function upsertFaqEntry(input: {
  actorUserId: string;
  code: string;
  question: string;
  answer: string;
  sortOrder?: number;
  active?: boolean;
}): Promise<void> {
  const previous = await prisma.cmsFaqEntry.findUnique({
    where: { code: input.code }
  });
  const data = {
    code: input.code,
    question: input.question,
    answer: input.answer,
    sortOrder: input.sortOrder ?? previous?.sortOrder ?? 0,
    active: input.active ?? previous?.active ?? true,
    updatedById: input.actorUserId
  };
  const row = await prisma.cmsFaqEntry.upsert({
    where: { code: input.code },
    update: data,
    create: data
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    entityType: "CmsFaqEntry",
    entityId: row.id,
    action: previous ? "update" : "create",
    previousValue: previous ?? undefined,
    newValue: row
  });
}

export async function deleteFaqEntry(input: {
  actorUserId: string;
  code: string;
}): Promise<void> {
  const row = await prisma.cmsFaqEntry.findUnique({
    where: { code: input.code }
  });
  if (!row) return;
  await prisma.cmsFaqEntry.delete({ where: { code: input.code } });
  await writeAudit({
    actorUserId: input.actorUserId,
    entityType: "CmsFaqEntry",
    entityId: row.id,
    action: "delete",
    previousValue: row
  });
}

/** Reorder via batched sortOrder updates. `codes` is the desired order. */
export async function reorderFaqEntries(input: {
  actorUserId: string;
  codes: string[];
}): Promise<void> {
  await prisma.$transaction(
    input.codes.map((code, i) =>
      prisma.cmsFaqEntry.update({
        where: { code },
        data: { sortOrder: i, updatedById: input.actorUserId }
      })
    )
  );
  await writeAudit({
    actorUserId: input.actorUserId,
    entityType: "CmsFaqEntry",
    entityId: "*",
    action: "reorder",
    newValue: { order: input.codes }
  });
}

// ─── How it works steps ───────────────────────────────────────────────────

export async function listActiveHowItWorksSteps(): Promise<
  CmsHowItWorksStepView[]
> {
  const rows = await prisma.cmsHowItWorksStep.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" }
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    description: r.description,
    stepNumber: r.stepNumber,
    highlight: r.highlight,
    sortOrder: r.sortOrder
  }));
}

/** Admin: full list including soft-deleted rows. */
export async function listAllHowItWorksSteps(): Promise<
  Array<CmsHowItWorksStepView & { active: boolean; updatedAt: Date }>
> {
  const rows = await prisma.cmsHowItWorksStep.findMany({
    orderBy: { sortOrder: "asc" }
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    description: r.description,
    stepNumber: r.stepNumber,
    highlight: r.highlight,
    sortOrder: r.sortOrder,
    active: r.active,
    updatedAt: r.updatedAt
  }));
}

export async function deleteHowItWorksStep(input: {
  actorUserId: string;
  code: string;
}): Promise<void> {
  const row = await prisma.cmsHowItWorksStep.findUnique({
    where: { code: input.code }
  });
  if (!row) return;
  await prisma.cmsHowItWorksStep.delete({ where: { code: input.code } });
  await writeAudit({
    actorUserId: input.actorUserId,
    entityType: "CmsHowItWorksStep",
    entityId: row.id,
    action: "delete",
    previousValue: row
  });
}

export async function upsertHowItWorksStep(input: {
  actorUserId: string;
  code: string;
  title: string;
  description: string;
  stepNumber: number;
  highlight?: boolean;
  sortOrder?: number;
  active?: boolean;
}): Promise<void> {
  const previous = await prisma.cmsHowItWorksStep.findUnique({
    where: { code: input.code }
  });
  const data = {
    code: input.code,
    title: input.title,
    description: input.description,
    stepNumber: input.stepNumber,
    highlight: input.highlight ?? previous?.highlight ?? false,
    sortOrder: input.sortOrder ?? previous?.sortOrder ?? 0,
    active: input.active ?? previous?.active ?? true,
    updatedById: input.actorUserId
  };
  const row = await prisma.cmsHowItWorksStep.upsert({
    where: { code: input.code },
    update: data,
    create: data
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    entityType: "CmsHowItWorksStep",
    entityId: row.id,
    action: previous ? "update" : "create",
    previousValue: previous ?? undefined,
    newValue: row
  });
}

// ─── Listing criteria cards ───────────────────────────────────────────────

export async function listActiveListingCriteria(): Promise<
  CmsListingCriterionView[]
> {
  const rows = await prisma.cmsListingCriterion.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" }
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    description: r.description,
    iconName: r.iconName,
    sortOrder: r.sortOrder
  }));
}

/** Admin: full list including soft-deleted rows. */
export async function listAllListingCriteria(): Promise<
  Array<CmsListingCriterionView & { active: boolean; updatedAt: Date }>
> {
  const rows = await prisma.cmsListingCriterion.findMany({
    orderBy: { sortOrder: "asc" }
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    description: r.description,
    iconName: r.iconName,
    sortOrder: r.sortOrder,
    active: r.active,
    updatedAt: r.updatedAt
  }));
}

export async function deleteListingCriterion(input: {
  actorUserId: string;
  code: string;
}): Promise<void> {
  const row = await prisma.cmsListingCriterion.findUnique({
    where: { code: input.code }
  });
  if (!row) return;
  await prisma.cmsListingCriterion.delete({ where: { code: input.code } });
  await writeAudit({
    actorUserId: input.actorUserId,
    entityType: "CmsListingCriterion",
    entityId: row.id,
    action: "delete",
    previousValue: row
  });
}

export async function upsertListingCriterion(input: {
  actorUserId: string;
  code: string;
  title: string;
  description: string;
  iconName?: string | null;
  sortOrder?: number;
  active?: boolean;
}): Promise<void> {
  const previous = await prisma.cmsListingCriterion.findUnique({
    where: { code: input.code }
  });
  const data = {
    code: input.code,
    title: input.title,
    description: input.description,
    iconName: input.iconName ?? previous?.iconName ?? null,
    sortOrder: input.sortOrder ?? previous?.sortOrder ?? 0,
    active: input.active ?? previous?.active ?? true,
    updatedById: input.actorUserId
  };
  const row = await prisma.cmsListingCriterion.upsert({
    where: { code: input.code },
    update: data,
    create: data
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    entityType: "CmsListingCriterion",
    entityId: row.id,
    action: previous ? "update" : "create",
    previousValue: previous ?? undefined,
    newValue: row
  });
}

// ─── Promo banner (singleton, id = "default") ─────────────────────────────

const PROMO_BANNER_ID = "default";

export async function getPromoBanner(): Promise<CmsPromoBannerView> {
  const row = await prisma.cmsPromoBanner.findUnique({
    where: { id: PROMO_BANNER_ID }
  });
  if (!row) {
    return {
      enabled: false,
      heading: null,
      body: null,
      ctaLabel: null,
      ctaHref: null
    };
  }
  return {
    enabled: row.enabled,
    heading: row.heading,
    body: row.body,
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref
  };
}

export async function updatePromoBanner(input: {
  actorUserId: string;
  enabled: boolean;
  heading: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
}): Promise<void> {
  const previous = await prisma.cmsPromoBanner.findUnique({
    where: { id: PROMO_BANNER_ID }
  });
  const data = {
    id: PROMO_BANNER_ID,
    enabled: input.enabled,
    heading: input.heading,
    body: input.body,
    ctaLabel: input.ctaLabel,
    ctaHref: input.ctaHref,
    updatedById: input.actorUserId
  };
  const row = await prisma.cmsPromoBanner.upsert({
    where: { id: PROMO_BANNER_ID },
    update: data,
    create: data
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    entityType: "CmsPromoBanner",
    entityId: row.id,
    action: previous ? "update" : "create",
    previousValue: previous ?? undefined,
    newValue: row
  });
}
