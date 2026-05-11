import Link from "next/link";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/portals/StatCard";

export const metadata = { title: "Sovereign Ops · Dashboard" };
export const dynamic = "force-dynamic";

export default async function SovereignDashboardPage() {
  const cfg = getConfig();

  const [
    listedInJurisdiction,
    providersInJurisdiction,
    sectorCount,
    openIncidents,
    sovereignBases
  ] = await Promise.all([
    prisma.resource.count({
      where: {
        primaryJurisdiction: { code: cfg.jurisdiction },
        lifecycleStatus: { code: "listed" }
      }
    }),
    prisma.provider.count({
      where: { homeJurisdiction: { code: cfg.jurisdiction } }
    }),
    prisma.sector.count({ where: { active: true } }),
    prisma.complaint.count({
      where: { status: { code: { in: ["open", "investigating"] } } }
    }),
    prisma.sovereigntyBasis.count({ where: { active: true } })
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
