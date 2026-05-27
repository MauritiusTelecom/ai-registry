import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
  const i18n = await getTranslations("verifier.reports");
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
        <h1 className="p-title">{i18n("title")}</h1>
        <p className="p-subtitle">
          {i18n("subtitleParagraph")}
        </p>
      </div>

      <div className="p-stat-grid">
        <Stat label={i18n("statQueue")} value={open} hint={i18n("hintOpenInReview")} />
        <Stat label={i18n("statDecided30d")} value={decided30} hint={i18n("hintApprovedOrRouted")} />
        <Stat label={i18n("statDecided90d")} value={decided90} hint={i18n("hintRollingQuarter")} />
        <Stat label={i18n("statWithdrawn90d")} value={withdrawn90} hint={i18n("hintClosedWithout")} />
      </div>

      <section className="glass" style={{ padding: 20, borderRadius: 12, marginTop: 8 }}>
        <h2 style={{ fontSize: 14, marginBottom: 12, fontWeight: 500 }}>{i18n("byReviewTypeHeading")}</h2>
        {byType.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
            {i18n("emptyState")}
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
          {i18n("crossLinks")}{" "}
          <Link href="/verifier/queue" className="p-footer-link">
            {i18n("linkQueue")}
          </Link>{" "}
          ·{" "}
          <Link href="/verifier/decided" className="p-footer-link">
            {i18n("linkDecided")}
          </Link>{" "}
          ·{" "}
          <Link href="/admin/audit" className="p-footer-link">
            {i18n("linkAuditLog")}
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
