/**
 * Portal command-palette / header-search executor.
 *
 * Given a query string and the current session's role, returns a small,
 * grouped result set hitting:
 *
 *   - Resources (case-insensitive substring on title / slug / AIR-ID)
 *   - Providers (substring on displayName / legalName / slug)
 *   - Static nav pages (the role's portal routes)
 *
 * Each role gets a tailored scope:
 *
 *   - admin     → every resource + every provider
 *   - provider  → only that provider's resources; no provider search (a
 *                 provider sees only themselves anyway)
 *   - verifier  → resources currently in submitted / in_review lifecycle
 *   - sovereign → publicly-listed resources
 *
 * The "page" results are static-typed at the bottom of this module so
 * users can quick-jump between portal screens by typing "compl" → Complaints.
 *
 * Returns are capped per source so the dropdown stays usable even on a
 * very broad term like "a". Empty query short-circuits to an empty list.
 */
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@airegistry/sdk";
import type { PortalRole } from "./notifications";

export type PortalSearchResult = {
  /** Stable id for React keying (`kind:identity`). */
  id: string;
  kind:
    | "resource"
    | "provider"
    | "user"
    | "complaint"
    | "review"
    | "incident"
    | "page";
  title: string;
  subtitle: string | null;
  href: string;
  /** Icon name (from the shared Icon component) rendered to the left of the title. */
  icon: string;
};

const RESULTS_PER_GROUP = 6;
const MIN_QUERY_LENGTH = 2;

export async function executeSearch(
  rawQuery: string,
  user: SessionUser,
  role: PortalRole
): Promise<PortalSearchResult[]> {
  const q = rawQuery.trim();

  // Empty query: skip the DB sources entirely but still return the static
  // pages list so the modal has something to render the moment it opens.
  // This is the "command-palette quick-nav" experience.
  if (q.length === 0) {
    return searchPages("", role);
  }

  // Below the minimum query length we still surface filtered pages — they
  // help users hit the right route even with a single character.
  if (q.length < MIN_QUERY_LENGTH) {
    return searchPages(q, role);
  }

  try {
    const [resources, providers, complaints, reviews, incidents, users] =
      await Promise.all([
        searchResources(q, user, role),
        searchProviders(q, role),
        searchComplaints(q, user, role),
        searchReviews(q, user, role),
        searchIncidents(q, user, role),
        searchUsers(q, role)
      ]);
    const pages = searchPages(q, role);

    // Ordering: pages first (instant nav), then the inbox-style entries,
    // then catalogue entries (resources / providers / users). The client
    // groups by `kind` so this only drives default keyboard-selection.
    return [
      ...pages,
      ...resources,
      ...complaints,
      ...reviews,
      ...incidents,
      ...providers,
      ...users
    ];
  } catch (error) {
    console.warn("portals.search.failed", error);
    return [];
  }
}

// ── Resources ────────────────────────────────────────────────────────
async function searchResources(
  q: string,
  user: SessionUser,
  role: PortalRole
): Promise<PortalSearchResult[]> {
  const baseWhere: Record<string, unknown> = {
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { airId: { contains: q, mode: "insensitive" } },
      { shortDescription: { contains: q, mode: "insensitive" } }
    ]
  };

  if (role === "provider") {
    if (!user.provider) return [];
    baseWhere.providerId = user.provider.id;
  } else if (role === "verifier") {
    baseWhere.lifecycleStatus = {
      code: { in: ["submitted", "in_review"] }
    };
  } else if (role === "sovereign") {
    baseWhere.lifecycleStatus = { code: "listed" };
    baseWhere.publicVisibility = true;
  }
  // admin: no extra scope

  const rows = await prisma.resource.findMany({
    where: baseWhere as never,
    orderBy: { updatedAt: "desc" },
    take: RESULTS_PER_GROUP,
    select: {
      id: true,
      slug: true,
      title: true,
      airId: true,
      lifecycleStatus: { select: { name: true, code: true } },
      provider: { select: { slug: true, displayName: true } }
    }
  });

  return rows.map((r) => ({
    id: `resource:${r.id}`,
    kind: "resource" as const,
    title: r.title,
    subtitle: subtitleForResource(r, role),
    href: hrefForResource(r, role),
    icon: "layers"
  }));
}

function hrefForResource(
  r: { id: string; slug: string; lifecycleStatus: { code: string } },
  role: PortalRole
): string {
  // Providers always land in their own CRUD area — the edit page for every
  // lifecycle state. (Listed resources still render as a read-only form
  // there; the link is never the public /registry detail because the
  // provider portal search must stay inside the provider portal.)
  if (role === "provider") return `/provider/resources/${r.id}/edit`;
  if (role === "admin") return `/admin/resources/${r.id}/edit`;
  return `/registry/${r.slug}`;
}

function subtitleForResource(
  r: {
    airId: string | null;
    lifecycleStatus: { name: string };
    provider: { displayName: string } | null;
  },
  role: PortalRole
): string {
  const bits: string[] = [r.lifecycleStatus.name];
  // Providers never need to see "their own org" — skip it.
  if (role !== "provider" && r.provider) {
    bits.unshift(r.provider.displayName);
  }
  if (r.airId) bits.push(r.airId);
  return bits.join(" · ");
}

// ── Providers ────────────────────────────────────────────────────────
async function searchProviders(
  q: string,
  role: PortalRole
): Promise<PortalSearchResult[]> {
  // Providers themselves have no use for provider search — they only see
  // themselves. Skip the query entirely.
  if (role === "provider") return [];

  const rows = await prisma.provider.findMany({
    where: {
      adminSuspended: false,
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { legalName: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } }
      ]
    },
    orderBy: { displayName: "asc" },
    take: RESULTS_PER_GROUP,
    select: {
      id: true,
      slug: true,
      displayName: true,
      legalName: true,
      status: { select: { name: true, code: true } }
    }
  });

  return rows.map((p) => ({
    id: `provider:${p.id}`,
    kind: "provider" as const,
    title: p.displayName,
    subtitle: subtitleForProvider(p, role),
    href: hrefForProvider(p, role),
    icon: "users"
  }));
}

function hrefForProvider(
  p: { id: string; slug: string },
  role: PortalRole
): string {
  if (role === "admin") return `/admin/providers/${p.id}`;
  return `/providers/${p.slug}`;
}

function subtitleForProvider(
  p: { legalName: string | null; status: { name: string } },
  _role: PortalRole
): string {
  const bits: string[] = [];
  if (p.legalName) bits.push(p.legalName);
  bits.push(p.status.name);
  return bits.join(" · ");
}

// ── Complaints ───────────────────────────────────────────────────────
async function searchComplaints(
  q: string,
  user: SessionUser,
  role: PortalRole
): Promise<PortalSearchResult[]> {
  // Verifier / sovereign have no inbox surface for complaints — skip.
  if (role === "verifier" || role === "sovereign") return [];

  const baseWhere: Record<string, unknown> = {
    OR: [
      { description: { contains: q, mode: "insensitive" } },
      { resolutionSummary: { contains: q, mode: "insensitive" } },
      { complainantName: { contains: q, mode: "insensitive" } },
      { targetResource: { title: { contains: q, mode: "insensitive" } } },
      { targetProvider: { displayName: { contains: q, mode: "insensitive" } } }
    ]
  };
  if (role === "provider") {
    if (!user.provider) return [];
    const providerId = user.provider.id;
    baseWhere.OR = [
      // Re-anchor the OR so it stays semantically the same but the target
      // scope is enforced separately. AND-ing the two OR groups produces
      // "matches the text AND belongs to my provider".
      {
        AND: [
          {
            OR: [
              { description: { contains: q, mode: "insensitive" } },
              { resolutionSummary: { contains: q, mode: "insensitive" } },
              { targetResource: { title: { contains: q, mode: "insensitive" } } }
            ]
          },
          {
            OR: [
              { targetProviderId: providerId },
              { targetResource: { providerId } }
            ]
          }
        ]
      }
    ];
  }

  const rows = await prisma.complaint.findMany({
    where: baseWhere as never,
    orderBy: [{ status: { sortOrder: "asc" } }, { createdAt: "desc" }],
    take: RESULTS_PER_GROUP,
    select: {
      id: true,
      description: true,
      submittedAt: true,
      complaintType: { select: { name: true } },
      severity: { select: { name: true } },
      status: { select: { name: true, code: true } },
      targetResource: { select: { title: true } },
      targetProvider: { select: { displayName: true } }
    }
  });

  return rows.map((c) => ({
    id: `complaint:${c.id}`,
    kind: "complaint" as const,
    title: titleForComplaint(c),
    subtitle: subtitleForComplaint(c),
    // Providers land on /provider/complaints?q=<query> so the FilteredDataTable
    // pre-filters to the matched row(s). Admins continue to land on the
    // per-id detail.
    href: hrefForComplaint(c.id, role, q),
    icon: "flag"
  }));
}

function titleForComplaint(c: {
  description: string;
  complaintType: { name: string };
  targetResource: { title: string } | null;
  targetProvider: { displayName: string } | null;
}): string {
  const target = c.targetResource?.title
    ? c.targetResource.title
    : c.targetProvider
      ? `Provider · ${c.targetProvider.displayName}`
      : "(no target)";
  return `${c.complaintType.name} — ${target}`;
}

function subtitleForComplaint(c: {
  description: string;
  severity: { name: string };
  status: { name: string };
}): string {
  const excerpt =
    c.description.length > 80
      ? `${c.description.slice(0, 80)}…`
      : c.description;
  return `${c.status.name} · ${c.severity.name} severity · ${excerpt}`;
}

function hrefForComplaint(id: string, role: PortalRole, q: string): string {
  if (role === "admin") return `/admin/complaints/${id}`;
  // Provider portal has only a list page — no per-complaint detail. Land
  // there with the search query so the FilteredDataTable narrows to the
  // matched row.
  return `/provider/complaints?q=${encodeURIComponent(q)}`;
}

// ── Reviews ──────────────────────────────────────────────────────────
async function searchReviews(
  q: string,
  user: SessionUser,
  role: PortalRole
): Promise<PortalSearchResult[]> {
  if (role === "sovereign") return [];

  const baseWhere: Record<string, unknown> = {
    OR: [
      { decisionSummary: { contains: q, mode: "insensitive" } },
      { conditions: { contains: q, mode: "insensitive" } },
      { resource: { title: { contains: q, mode: "insensitive" } } },
      { reviewType: { name: { contains: q, mode: "insensitive" } } }
    ]
  };
  if (role === "provider") {
    if (!user.provider) return [];
    const providerId = user.provider.id;
    baseWhere.OR = [
      {
        AND: [
          {
            OR: [
              { decisionSummary: { contains: q, mode: "insensitive" } },
              { conditions: { contains: q, mode: "insensitive" } },
              { resource: { title: { contains: q, mode: "insensitive" } } },
              { reviewType: { name: { contains: q, mode: "insensitive" } } }
            ]
          },
          {
            OR: [{ providerId }, { resource: { providerId } }]
          }
        ]
      }
    ];
  } else if (role === "verifier") {
    // Verifiers see open queues only — narrow to in-flight reviews.
    baseWhere.AND = [
      { status: { code: { in: ["open", "in_review"] } } }
    ];
  }

  const rows = await prisma.review.findMany({
    where: baseWhere as never,
    orderBy: [{ status: { sortOrder: "asc" } }, { createdAt: "desc" }],
    take: RESULTS_PER_GROUP,
    select: {
      id: true,
      decisionSummary: true,
      reviewType: { select: { name: true } },
      status: { select: { name: true, code: true } },
      resource: { select: { id: true, title: true, slug: true } }
    }
  });

  return rows.map((r) => ({
    id: `review:${r.id}`,
    kind: "review" as const,
    title: titleForReview(r),
    subtitle: subtitleForReview(r),
    href: hrefForReview(r.id, role, q),
    icon: "check"
  }));
}

function titleForReview(r: {
  reviewType: { name: string };
  resource: { title: string } | null;
}): string {
  const target = r.resource?.title ?? "Provider record";
  return `${r.reviewType.name} — ${target}`;
}

function subtitleForReview(r: {
  decisionSummary: string | null;
  status: { name: string };
}): string {
  if (r.decisionSummary && r.decisionSummary.trim() !== "") {
    const excerpt =
      r.decisionSummary.length > 80
        ? `${r.decisionSummary.slice(0, 80)}…`
        : r.decisionSummary;
    return `${r.status.name} · ${excerpt}`;
  }
  return r.status.name;
}

function hrefForReview(id: string, role: PortalRole, q: string): string {
  if (role === "admin" || role === "verifier") return `/admin/reviews/${id}`;
  return `/provider/reviews?q=${encodeURIComponent(q)}`;
}

// ── Incidents (enforcement actions) ──────────────────────────────────
async function searchIncidents(
  q: string,
  user: SessionUser,
  role: PortalRole
): Promise<PortalSearchResult[]> {
  // Only provider / admin care about enforcement actions. Verifiers and
  // sovereigns don't have an inbox surface for them.
  if (role === "verifier" || role === "sovereign") return [];

  const baseWhere: Record<string, unknown> = {
    OR: [
      { reason: { contains: q, mode: "insensitive" } },
      { publicNote: { contains: q, mode: "insensitive" } },
      { actionType: { name: { contains: q, mode: "insensitive" } } },
      { targetResource: { title: { contains: q, mode: "insensitive" } } },
      { targetProvider: { displayName: { contains: q, mode: "insensitive" } } }
    ]
  };
  if (role === "provider") {
    if (!user.provider) return [];
    const providerId = user.provider.id;
    baseWhere.OR = [
      {
        AND: [
          {
            OR: [
              { reason: { contains: q, mode: "insensitive" } },
              { publicNote: { contains: q, mode: "insensitive" } },
              { actionType: { name: { contains: q, mode: "insensitive" } } },
              { targetResource: { title: { contains: q, mode: "insensitive" } } }
            ]
          },
          {
            OR: [
              { targetProviderId: providerId },
              { targetResource: { providerId } }
            ]
          }
        ]
      }
    ];
  }

  const rows = await prisma.enforcementAction.findMany({
    where: baseWhere as never,
    orderBy: { performedAt: "desc" },
    take: RESULTS_PER_GROUP,
    select: {
      id: true,
      reason: true,
      publicNote: true,
      performedAt: true,
      actionType: { select: { name: true } },
      targetResource: { select: { title: true } },
      targetProvider: { select: { displayName: true } }
    }
  });

  return rows.map((a) => ({
    id: `incident:${a.id}`,
    kind: "incident" as const,
    title: titleForIncident(a),
    subtitle: subtitleForIncident(a),
    href: hrefForIncident(role, q),
    icon: "shield"
  }));
}

function titleForIncident(a: {
  actionType: { name: string };
  targetResource: { title: string } | null;
  targetProvider: { displayName: string } | null;
}): string {
  const target = a.targetResource?.title
    ? a.targetResource.title
    : a.targetProvider
      ? `Provider · ${a.targetProvider.displayName}`
      : "(no target)";
  return `${a.actionType.name} — ${target}`;
}

function subtitleForIncident(a: {
  reason: string;
  publicNote: string | null;
}): string {
  const note = a.publicNote && a.publicNote.trim() !== "" ? a.publicNote : a.reason;
  const excerpt = note.length > 80 ? `${note.slice(0, 80)}…` : note;
  return excerpt;
}

function hrefForIncident(role: PortalRole, q: string): string {
  // Provider only has the list page; admin has the same — neither has a
  // per-id detail. Pre-filter via ?q= so the destination grid narrows.
  if (role === "provider") return `/provider/incidents?q=${encodeURIComponent(q)}`;
  return `/admin/audit?q=${encodeURIComponent(q)}`;
}

// ── Users (admin only) ───────────────────────────────────────────────
async function searchUsers(
  q: string,
  role: PortalRole
): Promise<PortalSearchResult[]> {
  // Only admins have the user-management surface. Every other role gets
  // an empty list so we don't risk leaking emails / names.
  if (role !== "admin") return [];

  const rows = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } }
      ]
    },
    orderBy: { name: "asc" },
    take: RESULTS_PER_GROUP,
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { name: true } },
      status: { select: { name: true } }
    }
  });

  return rows.map((u) => ({
    id: `user:${u.id}`,
    kind: "user" as const,
    title: u.name,
    subtitle: `${u.email} · ${u.role.name} · ${u.status.name}`,
    // No per-user detail page in the admin CRUD — landing on /admin/users
    // with the email pre-filtered narrows the AdminGrid to the right row.
    // See AdminGrid's URL-seeding hook (q query param).
    href: `/admin/users?q=${encodeURIComponent(u.email)}`,
    icon: "user"
  }));
}

// ── Static portal pages ──────────────────────────────────────────────
// Quick-nav entries — typing "comp" → Complaints, "set" → Settings, etc.
// We keep this static (no DB read) so the user gets feedback even when
// the rest of the search is still in flight.

type StaticPage = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
};

const PAGES_BY_ROLE: Record<PortalRole, StaticPage[]> = {
  provider: [
    { id: "provider/dashboard", title: "Dashboard", subtitle: "Provider · overview", href: "/provider", icon: "home-alt" },
    { id: "provider/resources", title: "My resources", subtitle: "Provider · catalogue", href: "/provider/resources", icon: "layers" },
    { id: "provider/submissions", title: "Submissions", subtitle: "Provider · in flight", href: "/provider/submissions", icon: "inbox" },
    { id: "provider/publish", title: "Publish new resource", subtitle: "Provider · new draft", href: "/provider/publish", icon: "plus" },
    { id: "provider/complaints", title: "Complaints", subtitle: "Provider · inbox", href: "/provider/complaints", icon: "flag" },
    { id: "provider/reviews", title: "Reviews", subtitle: "Provider · inbox", href: "/provider/reviews", icon: "check" },
    { id: "provider/incidents", title: "Incidents", subtitle: "Provider · inbox", href: "/provider/incidents", icon: "shield" },
    { id: "provider/settings", title: "Settings", subtitle: "Provider · account", href: "/provider/settings", icon: "settings" }
  ],
  admin: [
    { id: "admin/dashboard", title: "Dashboard", subtitle: "Admin · overview", href: "/admin", icon: "home-alt" },
    { id: "admin/resources", title: "Resources", subtitle: "Admin · catalogue", href: "/admin/resources", icon: "layers" },
    { id: "admin/providers", title: "Providers", subtitle: "Admin · catalogue", href: "/admin/providers", icon: "users" },
    { id: "admin/reviews", title: "Review queue", subtitle: "Admin · governance", href: "/admin/reviews", icon: "check" },
    { id: "admin/complaints", title: "Flags & incidents", subtitle: "Admin · governance", href: "/admin/complaints", icon: "flag" },
    { id: "admin/policies", title: "Policies", subtitle: "Admin · governance", href: "/admin/policies", icon: "shield" },
    { id: "admin/users", title: "Users & roles", subtitle: "Admin · account", href: "/admin/users", icon: "user" },
    { id: "admin/audit", title: "Audit log", subtitle: "Admin · governance", href: "/admin/audit", icon: "audit" },
    { id: "admin/integrations", title: "Integrations", subtitle: "Admin · platform", href: "/admin/integrations", icon: "database" },
    { id: "admin/settings", title: "Settings", subtitle: "Admin · account", href: "/admin/settings", icon: "settings" }
  ],
  verifier: [
    { id: "verifier/dashboard", title: "Dashboard", subtitle: "Verifier · queue", href: "/verifier", icon: "home-alt" },
    { id: "verifier/settings", title: "Settings", subtitle: "Verifier · account", href: "/verifier/settings", icon: "settings" }
  ],
  sovereign: [
    { id: "sovereign/dashboard", title: "Dashboard", subtitle: "Sovereign · overview", href: "/sovereign", icon: "home-alt" }
  ]
};

/**
 * Static page hits. With an empty query we return the FULL list (capped to
 * 10) so the modal opens as a quick-nav menu. With any query we substring-
 * match title + subtitle case-insensitively. The cap rises from
 * `RESULTS_PER_GROUP` to 10 here because pages are cheap (no DB) and the
 * full admin list has nine entries.
 */
function searchPages(q: string, role: PortalRole): PortalSearchResult[] {
  const needle = q.toLowerCase();
  const pages = PAGES_BY_ROLE[role] ?? [];
  const matched =
    needle === ""
      ? pages
      : pages.filter(
          (p) =>
            p.title.toLowerCase().includes(needle) ||
            p.subtitle.toLowerCase().includes(needle)
        );
  return matched.slice(0, 10).map((p) => ({
    id: `page:${p.id}`,
    kind: "page" as const,
    title: p.title,
    subtitle: p.subtitle,
    href: p.href,
    icon: p.icon
  }));
}
