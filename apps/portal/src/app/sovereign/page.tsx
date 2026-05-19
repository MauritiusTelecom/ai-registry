import Link from "next/link";
import { getConfig } from "@airegistry/sdk";
import { StatCard } from "@/components/portals/StatCard";
import {
  countReferenceTable,
  loadSovereignDashboardStats
} from "@airegistry/sdk/server";

export const metadata = { title: "Sovereign Ops · Dashboard" };
export const dynamic = "force-dynamic";

export default async function SovereignDashboardPage() {
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
        <h1 className="p-title">Sovereign operations</h1>
        <p className="p-subtitle">
          National view of the registry - {cfg.jurisdiction} · operated by {cfg.operatorName}.
        </p>
      </div>

      <div className="p-stat-grid">
        <StatCard
          label={`Listed in ${cfg.jurisdiction}`}
          value={listedInJurisdiction}
          hint="this jurisdiction"
        />
        <StatCard
          label="Local providers"
          value={providersInJurisdiction}
          hint={`${cfg.jurisdiction} domiciled`}
        />
        <StatCard label="Sectors covered" value={sectorCount} />
        <StatCard label="Sovereignty bases" value={sovereignBases} />
        <StatCard
          label="Open incidents"
          value={openIncidents}
          intent={openIncidents > 0 ? "warning" : "positive"}
        />
      </div>

      <h2 style={{ marginTop: 24, marginBottom: 12, fontSize: 18 }}>Workspaces</h2>
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
            National catalogue →
          </div>
          <div style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5 }}>
            Resources listed in this jurisdiction, scoped to local sovereign relevance.
          </div>
        </Link>
      </div>
    </div>
  );
}
