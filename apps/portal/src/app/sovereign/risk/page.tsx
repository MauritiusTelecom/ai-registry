import Link from "next/link";
import {
  listReferenceTable,
  loadSovereignResourcesForRisk
} from "@airegistry/sdk/server";
import { getConfig } from "@airegistry/sdk";
import { DataTable, type Column } from "@/components/portals/DataTable";

export const metadata = { title: "Sovereign · Risk" };
export const dynamic = "force-dynamic";

type Tier = {
  code: string;
  name: string;
  total: number;
  listed: number;
  experimental: number;
  isolated: number;
};

type ResourceRow = {
  id: string;
  slug: string;
  title: string;
  provider: string;
  kind: string;
  riskCode: string;
  riskName: string;
  lifecycle: string;
};

const RISK_COLOUR: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444"
};

export default async function SovereignRiskPage() {
  const cfg = getConfig();

  // Aggregate every resource anchored in the sovereign jurisdiction by
  // risk tier and lifecycle bucket; surface a flat list of high-risk rows
  // so the operator can drill in.
  const [riskLevels, resources] = await Promise.all([
    listReferenceTable("riskLevel"),
    loadSovereignResourcesForRisk(cfg.jurisdiction)
  ]);

  const tiers: Tier[] = riskLevels.map((rl) => ({
    code: rl.code,
    name: rl.name,
    total: 0,
    listed: 0,
    experimental: 0,
    isolated: 0
  }));
  const byCode = new Map(tiers.map((t) => [t.code, t]));

  for (const r of resources) {
    const t = byCode.get(r.riskCode);
    if (!t) continue;
    t.total += 1;
    const lc = r.lifecycleCode;
    if (lc === "listed") t.listed += 1;
    else if (lc === "submitted" || lc === "in_review" || lc === "needs_update") {
      t.experimental += 1;
    } else if (lc === "suspended" || lc === "deprecated") {
      t.isolated += 1;
    }
  }

  const highRows: ResourceRow[] = resources
    .filter((r) => r.riskCode === "high")
    .slice(0, 100)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      provider: r.providerName,
      kind: r.resourceTypeCode,
      riskCode: r.riskCode,
      riskName: r.riskName,
      lifecycle: r.lifecycleCode
    }));

  const tierCols: Column<Tier>[] = [
    {
      key: "tier",
      label: "Tier",
      render: (row) => (
        <span style={{ color: RISK_COLOUR[row.code] ?? "var(--text)", fontWeight: 500 }}>
          {row.name}
        </span>
      )
    },
    { key: "total", label: "Total", render: (row) => row.total, mono: true },
    { key: "listed", label: "Listed", render: (row) => row.listed, mono: true },
    {
      key: "experimental",
      label: "In flight",
      render: (row) => row.experimental,
      mono: true
    },
    { key: "isolated", label: "Isolated", render: (row) => row.isolated, mono: true }
  ];

  const resCols: Column<ResourceRow>[] = [
    {
      key: "title",
      label: "Resource",
      render: (row) => (
        <Link
          href={`/registry/${row.slug}`}
          style={{ color: "var(--text)", textDecoration: "none" }}
        >
          {row.title}
        </Link>
      )
    },
    { key: "provider", label: "Provider", render: (row) => row.provider },
    { key: "kind", label: "Type", render: (row) => <span className="tag">{row.kind}</span> },
    {
      key: "lifecycle",
      label: "Lifecycle",
      render: (row) => <span className="mono">{row.lifecycle}</span>
    }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Risk register</h1>
        <p className="p-subtitle">
          Risk tier rollup for resources in <strong>{cfg.jurisdiction}</strong>. Tiers come from
          the operator-curated <code>risk_level</code> reference table; per-resource overrides live
          on each detail page.
        </p>
      </div>

      <h2 style={{ fontSize: 14, marginBottom: 10, color: "var(--text-2)" }}>By tier</h2>
      <DataTable
        rows={tiers}
        columns={tierCols}
        emptyState="No risk tiers configured."
        keyOf={(r) => r.code}
      />

      <h2 style={{ fontSize: 14, margin: "32px 0 10px", color: "var(--text-2)" }}>
        High-risk resources
      </h2>
      <DataTable
        rows={highRows}
