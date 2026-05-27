import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getConfig } from "@airegistry/sdk";
import { StatCard } from "@/components/portals/StatCard";
import {
  countReferenceTable,
  loadSovereignDashboardStats
} from "@airegistry/sdk/server";

export const metadata = { title: "Sovereign Ops · Dashboard" };
export const dynamic = "force-dynamic";

export default async function SovereignDashboardPage() {
  const t = await getTranslations("sovereign.dashboard");
  const cfg = getConfig();

  const [
    { listedInJurisdiction, providersInJurisdiction, openIncidents },
    sectorCount,
    sovereignBases
  ] = await Promise.all([
    loadSovereignDashboardStats(cfg.jurisdiction),
    countReferenceTable("sector"),
    countReferenceTable("sovereigntyBasis")
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
      </div>

      <div className="p-stat-grid">
        <StatCard
          label={t("listedInJurisdiction", { jurisdiction: cfg.jurisdiction })}
          value={listedInJurisdiction}
          hint={t("hintThisJurisdiction")}
        />
        <StatCard
          label={t("localProviders")}
          value={providersInJurisdiction}
          hint={t("hintDomiciled", { jurisdiction: cfg.jurisdiction })}
        />
        <StatCard label={t("sectorsCovered")} value={sectorCount} />
        <StatCard label={t("sovereigntyBases")} value={sovereignBases} />
        <StatCard
          label={t("openIncidents")}
          value={openIncidents}
          intent={openIncidents > 0 ? "warning" : "positive"}
        />
      </div>

      <h2 style={{ marginTop: 24, marginBottom: 12, fontSize: 18 }}>{t("workspaces")}</h2>
      <div className="p-stat-grid">
        <Link
          href="/sovereign/catalog"
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
            {t("nationalCatalogue")}
          </div>
          <div style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5 }}>
            {t("nationalCatalogueDesc")}
          </div>
        </Link>
      </div>
    </div>
  );
}
