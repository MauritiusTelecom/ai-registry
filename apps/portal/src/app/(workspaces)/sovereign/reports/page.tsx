import Link from "next/link";
import { getConfig } from "@airegistry/sdk";
import { loadSovereignReportsSnapshot } from "@airegistry/sdk/server";

export const metadata = { title: "Sovereign · Reports" };
export const dynamic = "force-dynamic";

/**
 * Sovereign · Reports - quarterly summary surface for the operator and
 * government stakeholders. The schema does not yet carry a `Report` model
 * (generation lands once the operator approves the canonical template); this
 * page renders a live "current quarter" snapshot from existing data so the
 * sovereign user can see what the next published report would contain.
 *
 * Module spec: `modules/sovereign/reports/product.md`.
 */
export default async function SovereignReportsPage() {
  const cfg = getConfig();
  const now = new Date();
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
  const yearQuarter = `${now.getUTCFullYear()}Q${quarter}`;
  const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const where = { primaryJurisdiction: { code: cfg.jurisdiction } };

  const [
    listed,
    listedThisQuarter,
    deprecated,
    decisionsThisQuarter,
    enforcementsThisQuarter,
    activeProviders,
    officialProviders
  ] = await (async () => {
    const s = await loadSovereignReportsSnapshot(cfg.jurisdiction);
    return [
      s.listedTotal,
      s.listedSince90d,
      s.deprecated,
      s.reviewsDecided90d,
      s.enforcementActions90d,
      s.providersTotal,
      s.providersOfficial
    ] as const;
  })();

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Reports</h1>
        <p className="p-subtitle">
          Quarterly snapshot of the registry in <strong>{cfg.jurisdiction}</strong>. Persisted
          report archives land once the report template is approved; this view always reflects the
          current data window.
        </p>
      </div>

      <section className="glass" style={{ padding: 22, borderRadius: 12, marginBottom: 18 }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16
          }}
        >
          <h2 style={{ fontSize: 16, margin: 0, fontWeight: 500 }}>Current quarter</h2>
          <span
            style={{
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 12,
              color: "var(--text-3)"
            }}
          >
            {yearQuarter}
          </span>
        </header>
        <div className="p-stat-grid" style={{ marginBottom: 0 }}>
          <Stat label="Listed (total)" value={listed} hint="public catalogue" />
          <Stat label="Listed (90d)" value={listedThisQuarter} hint="newly listed" />
          <Stat label="Deprecated" value={deprecated} hint="winding down" />
          <Stat
            label="Decisions (90d)"
            value={decisionsThisQuarter}
            hint="reviews completed"
          />
          <Stat
            label="Enforcements (90d)"
            value={enforcementsThisQuarter}
            hint="actions taken"
            warning={enforcementsThisQuarter > 0}
          />
          <Stat label="Local providers" value={activeProviders} hint="all statuses" />
          <Stat label="Official providers" value={officialProviders} hint="elevated" />
        </div>
      </section>

      <section className="glass" style={{ padding: 22, borderRadius: 12 }}>
        <h2 style={{ fontSize: 14, marginBottom: 12, fontWeight: 500 }}>Generated reports</h2>
        <p style={{ fontSize: 13.5, color: "var(--text-2)", margin: 0, lineHeight: 1.55 }}>
          No persisted quarterly reports yet. The first generation lands once the operator
          confirms the canonical template (sections, signatories, distribution list) - see the
          module spec at{" "}
          <code>ai-registry-specs/modules/sovereign/reports/product.md</code>. Until then, the
          snapshot above always reflects the current 90-day window.
        </p>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 14 }}>
          Cross-links:{" "}
          <Link href="/sovereign/incidents" className="p-footer-link">
            Incident log
          </Link>{" "}
          ·{" "}
          <Link href="/sovereign/risk" className="p-footer-link">
            Risk register
          </Link>{" "}
          ·{" "}
          <Link href="/sovereign/topology" className="p-footer-link">
            Topology
          </Link>{" "}
          ·{" "}
          <Link href="/admin/audit" className="p-footer-link">
            Audit log (admin)
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  warning = false
}: {
  label: string;
  value: number;
  hint: string;
  warning?: boolean;
}) {
  return (
    <div className="p-stat-card">
      <div className="p-stat-label">{label}</div>
      <div className="p-stat-value">{value}</div>
      <div className={`p-stat-hint${warning ? " warning" : ""}`}>{hint}</div>
    </div>
  );
}
