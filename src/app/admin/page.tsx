import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/portals/StatCard";

export const metadata = { title: "Admin · Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [
    resourceCount,
    listedCount,
    providerCount,
    verifiedProviderCount,
    userCount,
    openReviewCount,
    auditCount,
    openComplaintCount
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
    prisma.complaint.count({ where: { status: { code: { in: ["open", "investigating"] } } } })
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
        />
        <StatCard
          label="Verified providers"
          value={verifiedProviderCount}
          hint={`of ${providerCount} total`}
        />
        <StatCard
          label="Open reviews"
          value={openReviewCount}
          hint={openReviewCount > 0 ? "needs attention" : "all caught up"}
          intent={openReviewCount > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="Open complaints"
          value={openComplaintCount}
          intent={openComplaintCount > 0 ? "warning" : "positive"}
        />
        <StatCard label="Users" value={userCount} />
        <StatCard label="Audit entries" value={auditCount.toLocaleString()} />
      </div>

      <h2 style={{ marginTop: 24, marginBottom: 12, fontSize: 18 }}>Queues</h2>
      <div className="p-stat-grid">
        <QueueCard
          title="Sovereignty review queue"
          href="/admin/reviews"
          body="Open reviews for submitted resources — apply the §11 checklist, approve, reject, or request changes."
        />
        <QueueCard
          title="Audit log"
          href="/admin/audit"
          body="Append-only governance ledger. Every status transition, role change, and listing decision lands here."
        />
        <QueueCard
          title="Resources"
          href="/admin/resources"
          body="Catalogue management — search, filter, and lifecycle-action every listed resource across all providers."
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

function QueueCard({ title, href, body }: { title: string; href: string; body: string }) {
  return (
    <Link
      href={href}
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
