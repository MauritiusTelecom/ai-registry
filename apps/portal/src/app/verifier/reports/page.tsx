import Link from "next/link";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadVerifierReportsSnapshot } from "@airegistry/sdk/server";

export const metadata = { title: "Verifier · Reports" };
export const dynamic = "force-dynamic";

/**
 * Verifier · Reports - surface aggregate review activity. The signed
 * verification-report artefact (PDF / signed JSON) is post-MVP; this page
 * renders the rolling stats that would seed each report so reviewers can
 * see what would be published.
 *
 * Module spec: `modules/verifier/reports/product.md`.
 */
export default async function VerifierReportsPage() {
  const snap = await loadVerifierReportsSnapshot();
  const open = snap.open;
  const decided30 = snap.decided30;
  const decided90 = snap.decided90;
  const withdrawn90 = snap.withdrawn90;
  // Reshape to match the original prisma.groupBy result shape so the
  // downstream rendering code doesn't need to change.
  const byType = snap.byTypeId.map((g) => ({
    reviewTypeId: g.reviewTypeId,
    _count: { _all: g.count }
  }));

  const types = await listReferenceTable("reviewType", { activeOnly: false });
  const nameById = new Map(types.map((t) => [t.id, t.name]));

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Reports</h1>
        <p className="p-subtitle">
          Aggregate review activity. Signed verification artefacts (PDF / signed JSON) generate
          here once the report template ships; the snapshot below always reflects current data.
        </p>
      </div>

      <div className="p-stat-grid">
        <Stat label="Queue" value={open} hint="open + in review" />
        <Stat label="Decided (30d)" value={decided30} hint="approved or routed back" />
        <Stat label="Decided (90d)" value={decided90} hint="rolling quarter" />
        <Stat label="Withdrawn (90d)" value={withdrawn90} hint="closed without decision" />
      </div>

      <section className="glass" style={{ padding: 20, borderRadius: 12, marginTop: 8 }}>
        <h2 style={{ fontSize: 14, marginBottom: 12, fontWeight: 500 }}>By review type (90d)</h2>
        {byType.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
            No decided reviews in the last 90 days.
          </p>
        ) : (
          <ul
            style={{
              display: "grid",
              gap: 8,
              fontSize: 13,
              padding: 0,
              listStyle: "none",
              margin: 0
            }}
          >
            {byType.map((g) => (
              <li
                key={g.reviewTypeId}
                style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}
              >
                <span style={{ color: "var(--text)" }}>
                  {nameById.get(g.reviewTypeId) ?? "-"}
                </span>
                <span
                  style={{ fontFamily: "IBM Plex Mono, monospace", color: "var(--text-2)" }}
                >
                  {g._count._all}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 14 }}>
          Cross-links:{" "}
          <Link href="/verifier/queue" className="p-footer-link">
            Queue
          </Link>{" "}
          ·{" "}
          <Link href="/verifier/decided" className="p-footer-link">
            Decided
          </Link>{" "}
          ·{" "}
          <Link href="/admin/audit" className="p-footer-link">
            Audit log
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="p-stat-card">
      <div className="p-stat-label">{label}</div>
      <div className="p-stat-value">{value}</div>
      <div className="p-stat-hint">{hint}</div>
    </div>
  );
}
