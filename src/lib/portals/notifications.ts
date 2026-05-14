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
import type { SessionUser } from "@/lib/auth/current-user";

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

export async function loadPortalNotifications(
  user: SessionUser,
  currentRole: PortalRole
): Promise<PortalNotification[]> {
  try {
    if (currentRole === "provider") return await loadProviderNotifications(user);
    if (currentRole === "admin") return await loadAdminNotifications();
    return [];
  } catch (error) {
    // Notifications are decorative — a query failure must never crash the
    // page render. Log and degrade to an empty list.
    console.warn("portals.notifications.failed", error);
    return [];
  }
}

async function loadProviderNotifications(user: SessionUser): Promise<PortalNotification[]> {
  if (!user.provider) return [];
  const providerId = user.provider.id;

  // Run the three feeds in parallel — each is a narrow query bounded by
  // provider scope and a small `take` so the header never blocks on a
  // heavy read.
  const [openReviews, openComplaints, recentDecisions] = await Promise.all([
    prisma.review.findMany({
      where: {
        OR: [{ providerId }, { resource: { providerId } }],
        status: { code: { in: ["open", "in_review"] } }
      },
      orderBy: { createdAt: "desc" },
      take: 5,
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
      take: 5,
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
        completedAt: { not: null, gte: daysAgo(7) }
      },
      orderBy: { completedAt: "desc" },
      take: 5,
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
  return entries.slice(0, MAX_ENTRIES);
}

async function loadAdminNotifications(): Promise<PortalNotification[]> {
  const [openReviewCount, openComplaintCount] = await Promise.all([
    prisma.review.count({
      where: { status: { code: { in: ["open", "in_review"] } } }
    }),
    prisma.complaint.count({
      where: { status: { code: { in: ["open", "investigating"] } } }
    })
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
  return entries;
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
