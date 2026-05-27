import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
  const i18n = await getTranslations("sovereign.reports");
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
        <h1 className="p-title">{i18n("title")}</h1>
        <p className="p-subtitle">
          {i18n.rich("subtitleText", {
            jurisdiction: cfg.jurisdiction,
            bold: (chunks) => <strong>{chunks}</strong>
          })}
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
          <h2 style={{ fontSize: 16, margin: 0, fontWeight: 500 }}>{i18n("currentQuarter")}</h2>
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
          <Stat label={i18n("listedTotal")} value={listed} hint={i18n("hintPublicCatalogue")} />
          <Stat label={i18n("listed90d")} value={listedThisQuarter} hint={i18n("hintNewlyListed")} />
          <Stat label={i18n("deprecated")} value={deprecated} hint={i18n("hintWindingDown")} />
          <Stat
            label={i18n("decisions90d")}
            value={decisionsThisQuarter}
            hint={i18n("hintReviewsCompleted")}
          />
          <Stat
            label={i18n("enforcements90d")}
            value={enforcementsThisQuarter}
            hint={i18n("hintActionsTaken")}
            warning={enforcementsThisQuarter > 0}
          />
          <Stat label={i18n("localProviders")} value={activeProviders} hint={i18n("hintAllStatuses")} />
          <Stat label={i18n("officialProviders")} value={officialProviders} hint={i18n("hintElevated")} />
        </div>
      </section>

      <section className="glass" style={{ padding: 22, borderRadius: 12 }}>
        <h2 style={{ fontSize: 14, marginBottom: 12, fontWeight: 500 }}>{i18n("generatedReports")}</h2>
        <p style={{ fontSize: 13.5, color: "var(--text-2)", margin: 0, lineHeight: 1.55 }}>
          {i18n("noPersistedReports", { specPath: "ai-registry-specs/modules/sovereign/reports/product.md" })}
        </p>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 14 }}>
          {i18n("crossLinks")}{" "}
          <Link href="/sovereign/incidents" className="p-footer-link">
            {i18n("incidentLog")}
          </Link>{" "}
          ·{" "}
          <Link href="/sovereign/risk" className="p-footer-link">
            {i18n("riskRegister")}
          </Link>{" "}
          ·{" "}
          <Link href="/sovereign/topology" className="p-footer-link">
            {i18n("topology")}
          </Link>{" "}
          ·{" "}
          <Link href="/admin/audit" className="p-footer-link">
            {i18n("auditLogAdmin")}
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
