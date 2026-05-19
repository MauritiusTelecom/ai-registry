import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/portals/StatCard";

export const metadata = { title: "Verifier · Dashboard" };
export const dynamic = "force-dynamic";

export default async function VerifierDashboardPage() {
  const [openReviews, decided30d, redteamFindings, signedReports] = await Promise.all([
    prisma.review.count({ where: { status: { code: { in: ["open", "in_review"] } } } }),
    prisma.review.count({
      where: {
        status: { code: "decided" },
        completedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    }),
    // Phase 4 will populate these; keep zeros until then.
    Promise.resolve(0),
    Promise.resolve(0)
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Verifier portal</h1>
        <p className="p-subtitle">
          Apply the §11 sovereignty review checklist. Decisions write to the audit ledger.
        </p>
      </div>

      <div className="p-stat-grid">
        <StatCard
          label="Open reviews"
          value={openReviews}
          intent={openReviews > 0 ? "warning" : "positive"}
          hint={openReviews > 0 ? "needs attention" : "queue clear"}
        />
        <StatCard label="Decided (30d)" value={decided30d} />
        <StatCard label="Red-team findings" value={redteamFindings} hint="Phase 4" />
        <StatCard label="Signed reports" value={signedReports} hint="Phase 4" />
      </div>

      <h2 style={{ marginTop: 24, marginBottom: 12, fontSize: 18 }}>Workspaces</h2>
      <div className="p-stat-grid">
        <Link
          href="/verifier/queue"
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
            Review queue →
          </div>
          <div style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5 }}>
            Open and in-review submissions waiting for the §11 checklist.
          </div>
        </Link>
      </div>
    </div>
  );
}
