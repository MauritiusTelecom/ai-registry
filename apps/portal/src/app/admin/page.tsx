import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@airegistry/sdk/server";
import { StatCard } from "@/components/portals/StatCard";

export const metadata = { title: "Admin · Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const me = await getCurrentUser();
  const myId = me?.id ?? null;

  const [
    resourceCount,
    listedCount,
    providerCount,
    verifiedProviderCount,
    userCount,
    openReviewCount,
    auditCount,
    openComplaintCount,
    myOpenComplaintCount
  ] = await Promise.all([
    prisma.resource.count(),
    prisma.resource.count({ where: { lifecycleStatus: { code: "listed" } } }),
    prisma.provider.count(),
    prisma.provider.count({
      where: {
        OR: [{ status: { code: "verified" } }, { status: { code: "official_provider" } }]
      }
    }),
    prisma.user.count(),
    prisma.review.count({ where: { status: { code: { in: ["open", "in_review"] } } } }),
    prisma.auditLog.count(),
    prisma.complaint.count({ where: { status: { code: { in: ["open", "investigating"] } } } }),
    myId
      ? prisma.complaint.count({
          where: {
            assignedToId: myId,
            status: { code: { in: ["open", "investigating"] } }
          }
        })
      : Promise.resolve(0)
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Sovereign control plane</h1>
        <p className="p-subtitle">
          Operator console for governance, lifecycle, and audit. All queues route through
          this portal.
        </p>
      </div>

      <div className="p-stat-grid">
        <StatCard
          label="Listed resources"
          value={listedCount}
          hint={`of ${resourceCount} total`}
          href="/admin/resources"
        />
        <StatCard
          label="Verified providers"
          value={verifiedProviderCount}
          hint={`of ${providerCount} total`}
          href="/admin/providers"
        />
        <StatCard
          label="Open reviews"
          value={openReviewCount}
          hint={openReviewCount > 0 ? "needs attention" : "all caught up"}
          intent={openReviewCount > 0 ? "warning" : "positive"}
          href="/admin/reviews"
        />
        <StatCard
          label="Open complaints"
          value={openComplaintCount}
          intent={openComplaintCount > 0 ? "warning" : "positive"}
          href="/admin/complaints"
        />
        <StatCard label="Users" value={userCount} href="/admin/users" />
        <StatCard
          label="Audit entries"
          value={auditCount.toLocaleString()}
          href="/admin/audit"
        />
      </div>

      {/*
        Personal queue card - only renders for a signed-in user. Lives between
        the registry-wide stats and the queue list so the operator's own
        landing on the dashboard makes their open work immediately visible.
      */}
      {me ? (
        <div style={{ marginTop: 24 }}>
          <MyOpenComplaintsCard count={myOpenComplaintCount} name={me.name} />
        </div>
      ) : null}

      <h2 style={{ marginTop: 24, marginBottom: 12, fontSize: 18 }}>Queues</h2>
      <div className="p-stat-grid">
        <QueueCard
          title="Sovereignty review queue"
          href="/admin/reviews"
          body="Open reviews for submitted resources - apply the §11 checklist, approve, reject, or request changes."
        />
        <QueueCard
          title="Audit log"
          href="/admin/audit"
          body="Append-only governance ledger. Every status transition, role change, and listing decision lands here."
        />
        <QueueCard
          title="Resources"
          href="/admin/resources"
          body="Catalogue management - search, filter, and lifecycle-action every listed resource across all providers."
        />
        <QueueCard
          title="Providers"
          href="/admin/providers"
          body="Verify provider identity, suspend, or elevate to official-provider posture."
        />
      </div>
    </div>
  );
}

/**
 * Personal "what's on your plate" card on the admin dashboard. Renders the
 * count of open / investigating complaints assigned to the signed-in admin
 * and links straight to the "Assigned to me" filter on the Complaints page.
 *
 * When the count is zero the card shifts to a positive "all clear" tone so
 * the admin doesn't see warning colours for empty work.
 */
function MyOpenComplaintsCard({ count, name }: { count: number; name: string }) {
  const hasWork = count > 0;
  return (
    <Link
      href="/admin/complaints?status=mine"
      className="feature-card p-stat-card-link"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 18,
        textDecoration: "none",
        background: hasWork
          ? "linear-gradient(96deg, rgba(245, 158, 11, 0.10), rgba(245, 158, 11, 0.04))"
          : "var(--panel)",
        border: hasWork ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid var(--border)",
        borderRadius: 12,
        padding: "18px 22px",
        color: "inherit"
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 10.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            marginBottom: 6
          }}
        >
          Your queue
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>
          {hasWork
            ? `${count} open complaint${count === 1 ? "" : "s"} assigned to you`
            : `No complaints assigned to you`}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          {hasWork
            ? `Hi ${name}, these are waiting on you. Tap to open the filtered queue.`
            : `Hi ${name}, you're all caught up.`}
        </div>
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 600,
          fontFamily: "IBM Plex Mono, monospace",
          color: hasWork ? "#f59e0b" : "var(--text-3)",
          minWidth: 50,
          textAlign: "right"
        }}
      >
        {count}
      </div>
    </Link>
  );
}

function QueueCard({ title, href, body }: { title: string; href: string; body: string }) {
  // `feature-card` paints the primary→tertiary gradient-ring glow on hover
  // (same effect as the public-home cards). `p-stat-card-link` adds the
  // matching lift + focus ring so admin / provider / public dashboards all
  // share one hover language.
  return (
    <Link
      href={href}
      className="feature-card p-stat-card-link"
      style={{
        display: "block",
        textDecoration: "none",
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 22px",
        color: "inherit"
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5 }}>{body}</div>
      <div
        style={{
          marginTop: 12,
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--text-3)"
        }}
      >
        Open →
      </div>
    </Link>
  );
}
