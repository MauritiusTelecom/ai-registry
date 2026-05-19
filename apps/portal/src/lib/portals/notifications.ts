/**
 * Portal header notification feed.
 *
 * Returns notification entries scoped to the currently signed-in user's
 * role and (for providers) their provider linkage. Replaces the static
 * mock that previously surfaced admin-flavoured items in every portal —
 * a provider should never see "Audit log signed" or other operator
 * notifications.
 *
 * Each role implementation queries only data it should be able to see:
 *
 *   - provider → reviews on their resources, complaints against their
 *                organisation/resources, recent lifecycle decisions.
 *   - admin    → review queue depth and unhandled public complaints.
 *   - verifier / sovereign → empty for now (placeholders).
 */
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@airegistry/sdk";

export type PortalNotification = {
  id: string;
  kind: "review" | "alert" | "audit" | "system";
  title: string;
  body: string;
  /** Pre-formatted relative-time string (e.g. "2m ago"). */
  ts: string;
  unread: boolean;
};

export type PortalRole = "admin" | "provider" | "verifier" | "sovereign";

const MAX_ENTRIES = 12;
const MAX_PAGE_ENTRIES = 200;
const DEFAULT_LOOKBACK_DAYS = 7;
const PAGE_LOOKBACK_DAYS = 90;

/**
 * Options to widen the loader for the full-page notifications surface.
 *
 *   - `unlimited`   — drop the small MAX_ENTRIES cap used by the bell.
 *   - `lookbackDays` — how far back to pull "recent decisions" entries.
 *                      The default (7 days) is the bell's window.
 */
export type LoadNotificationsOptions = {
  unlimited?: boolean;
  lookbackDays?: number;
};

export async function loadPortalNotifications(
  user: SessionUser,
  currentRole: PortalRole,
  opts: LoadNotificationsOptions = {}
): Promise<PortalNotification[]> {
  try {
    const entries =
      currentRole === "provider"
        ? await loadProviderNotifications(user, opts)
        : currentRole === "admin"
          ? await loadAdminNotifications(opts)
          : [];
    if (entries.length === 0) return entries;
    // Layer persisted read-receipts on top — anything in NotificationRead
    // for this user flips `unread` to false. Doing the join in a second
    // query keeps the per-role builders simple and small.
    return applyReadReceipts(user.id, entries);
  } catch (error) {
    // Notifications are decorative — a query failure must never crash the
    // page render. Log and degrade to an empty list.
    console.warn("portals.notifications.failed", error);
    return [];
  }
}

/**
 * Look up which notificationKey(s) the user has already dismissed and flip
 * the `unread` flag accordingly. Best-effort — a query failure leaves the
 * entries as the per-role builder set them.
 */
async function applyReadReceipts(
  userId: string,
  entries: PortalNotification[]
): Promise<PortalNotification[]> {
  const keys = entries.map((e) => e.id);
  try {
    const reads = await prisma.notificationRead.findMany({
      where: { userId, notificationKey: { in: keys } },
      select: { notificationKey: true }
    });
    if (reads.length === 0) return entries;
    const readSet = new Set(reads.map((r) => r.notificationKey));
    return entries.map((e) => (readSet.has(e.id) ? { ...e, unread: false } : e));
  } catch (error) {
    console.warn("portals.notifications.read_receipts_failed", error);
    return entries;
  }
}

/**
 * Returns all notificationKeys currently visible to a user. The bell's
 * "Mark all read" endpoint calls this so the server can persist a single
 * read-receipt per visible entry instead of trusting an arbitrary list of
 * keys submitted by the client.
 */
export async function listNotificationKeysFor(
  user: SessionUser,
  currentRole: PortalRole
): Promise<string[]> {
  try {
    const entries =
      currentRole === "provider"
        ? await loadProviderNotifications(user)
        : currentRole === "admin"
          ? await loadAdminNotifications()
          : [];
    return entries.map((e) => e.id);
  } catch (error) {
    console.warn("portals.notifications.list_keys_failed", error);
    return [];
  }
}

async function loadProviderNotifications(
  user: SessionUser,
  opts: LoadNotificationsOptions = {}
): Promise<PortalNotification[]> {
  if (!user.provider) return [];
  const providerId = user.provider.id;
  // Wider window + larger cap for the full notifications page; narrow
  // defaults for the bell.
  const take = opts.unlimited ? MAX_PAGE_ENTRIES : 5;
  const lookbackDays =
    opts.lookbackDays ?? (opts.unlimited ? PAGE_LOOKBACK_DAYS : DEFAULT_LOOKBACK_DAYS);

  const [openReviews, openComplaints, recentDecisions] = await Promise.all([
    prisma.review.findMany({
      where: {
        OR: [{ providerId }, { resource: { providerId } }],
        status: { code: { in: ["open", "in_review"] } }
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        createdAt: true,
        status: { select: { code: true, name: true } },
        resource: { select: { id: true, title: true } }
      }
    }),
    prisma.complaint.findMany({
      where: {
        OR: [{ targetProviderId: providerId }, { targetResource: { providerId } }],
        status: { code: { in: ["open", "investigating"] } }
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        createdAt: true,
        severity: { select: { name: true } },
        status: { select: { code: true, name: true } },
        targetResource: { select: { title: true } }
      }
    }),
    prisma.review.findMany({
      where: {
        resource: { providerId },
        status: { code: "decided" },
        completedAt: { not: null, gte: daysAgo(lookbackDays) }
      },
      orderBy: { completedAt: "desc" },
      take,
      select: {
        id: true,
        completedAt: true,
        decisionSummary: true,
        resource: { select: { id: true, title: true } }
      }
    })
  ]);

  const entries: PortalNotification[] = [];

  for (const r of openReviews) {
    entries.push({
      id: `review:${r.id}`,
      kind: "review",
      title:
        r.status.code === "open"
          ? "Review opened on your resource"
          : "Review in progress",
      body: r.resource?.title
        ? `${r.resource.title} — ${r.status.name}`
        : `Status: ${r.status.name}`,
      ts: formatRelative(r.createdAt),
      unread: true
    });
  }

  for (const c of openComplaints) {
    entries.push({
      id: `complaint:${c.id}`,
      kind: "alert",
      title:
        c.status.code === "open"
          ? "New complaint filed"
          : "Complaint under investigation",
      body: c.targetResource?.title
        ? `${c.targetResource.title} — severity ${c.severity.name}`
        : `Severity ${c.severity.name}`,
      ts: formatRelative(c.createdAt),
      unread: true
    });
  }

  for (const d of recentDecisions) {
    entries.push({
      id: `decision:${d.id}`,
      kind: "review",
      title: "Review decided",
      body: d.resource?.title
        ? `${d.resource.title}${d.decisionSummary ? ` — ${shortSummary(d.decisionSummary)}` : ""}`
        : d.decisionSummary
          ? shortSummary(d.decisionSummary)
          : "A decision was recorded.",
      ts: d.completedAt ? formatRelative(d.completedAt) : "recently",
      unread: false
    });
  }

  // Sort newest-first across all sources, cap to MAX_ENTRIES.
  entries.sort((a, b) => relativeRank(b.ts) - relativeRank(a.ts));
  // Bell uses the small MAX_ENTRIES cap; the full-page surface gets up
  // to MAX_PAGE_ENTRIES so search / filter / pagination have something
  // to work with.
  return entries.slice(0, opts.unlimited ? MAX_PAGE_ENTRIES : MAX_ENTRIES);
}

async function loadAdminNotifications(
  opts: LoadNotificationsOptions = {}
): Promise<PortalNotification[]> {
  // The bell aggregates counts into two roll-up entries. On the full
  // page we additionally surface the most recent individual reviews and
  // complaints so the admin can scan / search them.
  const [openReviewCount, openComplaintCount, openReviews, openComplaints] =
    await Promise.all([
      prisma.review.count({
        where: { status: { code: { in: ["open", "in_review"] } } }
      }),
      prisma.complaint.count({
        where: { status: { code: { in: ["open", "investigating"] } } }
      }),
      opts.unlimited
        ? prisma.review.findMany({
            where: { status: { code: { in: ["open", "in_review"] } } },
            orderBy: { createdAt: "desc" },
            take: MAX_PAGE_ENTRIES,
            select: {
              id: true,
              createdAt: true,
              status: { select: { name: true } },
              resource: { select: { title: true } },
              provider: { select: { displayName: true } }
            }
          })
        : Promise.resolve([] as never[]),
      opts.unlimited
        ? prisma.complaint.findMany({
            where: { status: { code: { in: ["open", "investigating"] } } },
            orderBy: { createdAt: "desc" },
            take: MAX_PAGE_ENTRIES,
            select: {
              id: true,
              createdAt: true,
              severity: { select: { name: true } },
              status: { select: { name: true } },
              targetResource: { select: { title: true } },
              targetProvider: { select: { displayName: true } }
            }
          })
        : Promise.resolve([] as never[])
    ]);

  const entries: PortalNotification[] = [];
  if (openReviewCount > 0) {
    entries.push({
      id: "admin:reviews",
      kind: "review",
      title: "Pending review queue",
      body: `${openReviewCount} review${openReviewCount === 1 ? "" : "s"} awaiting a decision`,
      ts: "now",
      unread: true
    });
  }
  if (openComplaintCount > 0) {
    entries.push({
      id: "admin:complaints",
      kind: "alert",
      title: "Open public complaints",
      body: `${openComplaintCount} complaint${openComplaintCount === 1 ? "" : "s"} need triage`,
      ts: "now",
      unread: true
    });
  }

  // Per-row entries only on the full-page surface.
  for (const r of openReviews as Array<{
    id: string;
    createdAt: Date;
    status: { name: string };
    resource: { title: string } | null;
    provider: { displayName: string } | null;
  }>) {
    entries.push({
      id: `review:${r.id}`,
      kind: "review",
      title: `Review · ${r.status.name}`,
      body: r.resource?.title
        ? r.resource.title
        : r.provider?.displayName
          ? `Provider · ${r.provider.displayName}`
          : "(no target)",
      ts: formatRelative(r.createdAt),
      unread: true
    });
  }
  for (const c of openComplaints as Array<{
    id: string;
    createdAt: Date;
    severity: { name: string };
    status: { name: string };
    targetResource: { title: string } | null;
    targetProvider: { displayName: string } | null;
  }>) {
    entries.push({
      id: `complaint:${c.id}`,
      kind: "alert",
      title: `Complaint · ${c.status.name}`,
      body: c.targetResource?.title
        ? `${c.targetResource.title} — ${c.severity.name} severity`
        : c.targetProvider?.displayName
          ? `Provider · ${c.targetProvider.displayName} — ${c.severity.name} severity`
          : `${c.severity.name} severity`,
      ts: formatRelative(c.createdAt),
      unread: true
    });
  }

  return entries.slice(0, opts.unlimited ? MAX_PAGE_ENTRIES : MAX_ENTRIES);
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function shortSummary(s: string): string {
  const t = s.trim();
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
}

function formatRelative(when: Date): string {
  const ms = Date.now() - when.getTime();
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}

/**
 * Cheap relative-rank for sorting — newer entries should bubble to the top.
 * Smaller-unit strings get bigger numbers.
 */
function relativeRank(ts: string): number {
  const m = ts.match(/^(\d+)\s*([a-z]+)/i);
  if (!m) return 0;
  const n = Number.parseInt(m[1] ?? "0", 10);
  const unit = (m[2] ?? "").toLowerCase();
  const scale: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
    w: 60 * 60 * 24 * 7,
    mo: 60 * 60 * 24 * 30,
    y: 60 * 60 * 24 * 365
  };
  const sec = (scale[unit] ?? scale[unit[0] ?? "s"] ?? 1) * n;
  // Invert so smaller absolute age = higher rank.
  return -sec;
}
