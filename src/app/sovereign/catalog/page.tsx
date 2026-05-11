import Link from "next/link";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";
import { deriveDisplayStatus } from "@/lib/discovery/serializers";

export const metadata = { title: "Sovereign · National catalogue" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  airId: string | null;
  slug: string;
  title: string;
  kind: string;
  provider: string;
  bases: string[];
  status: string;
  lifecycle: string;
};

export default async function SovereignCatalogPage() {
  const cfg = getConfig();

  const rows = await prisma.resource.findMany({
    where: { primaryJurisdiction: { code: cfg.jurisdiction } },
    include: {
      resourceType: { select: { code: true } },
      provider: { select: { displayName: true } },
      lifecycleStatus: true,
      trustSignals: { include: { kind: true, status: true } },
      resourceBases: { include: { sovereigntyBasis: { select: { code: true, name: true } } } }
    },
    orderBy: [{ lifecycleStatus: { sortOrder: "asc" } }, { title: "asc" }]
  });

  const projected: Row[] = rows.map((r) => ({
    id: r.id,
    airId: r.airId,
    slug: r.slug,
    title: r.title,
    kind: r.resourceType.code,
    provider: r.provider.displayName,
    bases: r.resourceBases.map((rb) => rb.sovereigntyBasis.name),
    status: deriveDisplayStatus({
      ...r,
      lifecycleStatus: r.lifecycleStatus,
      trustSignals: r.trustSignals
    }),
    lifecycle: r.lifecycleStatus.name
  }));

  const columns: Column<Row>[] = [
    {
      key: "title",
      label: "Resource",
      render: (row) => (
        <div>
          <Link href={`/registry/${row.slug}`} style={{ color: "var(--text)", textDecoration: "none" }}>
            {row.title}
          </Link>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", fontFamily: "IBM Plex Mono, monospace" }}>
            {row.airId ?? "(no AIR-ID)"}
          </div>
        </div>
      )
    },
    { key: "kind", label: "Kind", render: (row) => <span className="tag">{row.kind}</span> },
    { key: "provider", label: "Provider", render: (row) => row.provider },
    {
      key: "bases",
      label: "Sovereignty bases",
      render: (row) =>
        row.bases.length > 0 ? (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {row.bases.map((b) => (
              <span key={b} className="tag">{b}</span>
            ))}
          </div>
        ) : (
          "-"
        )
    },
    { key: "lifecycle", label: "Lifecycle", render: (row) => row.lifecycle },
    { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">National catalogue · {cfg.jurisdiction}</h1>
        <p className="p-subtitle">
          {projected.length} listed resource{projected.length === 1 ? "" : "s"} carrying a
          primary jurisdiction of {cfg.jurisdiction}.
        </p>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState={`No resources are listed in ${cfg.jurisdiction} yet.`}
        keyOf={(r) => r.id}
      />
    </div>
  );
}
