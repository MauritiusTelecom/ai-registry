import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";
import { deriveDisplayStatus } from "@/lib/discovery/serializers";

export const metadata = { title: "Admin · Resources" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  airId: string | null;
  slug: string;
  title: string;
  kind: string;
  provider: string;
  providerSlug: string;
  status: string;
  lifecycle: string;
  updatedAt: string;
};

export default async function AdminResourcesPage() {
  const rows = await prisma.resource.findMany({
    include: {
      resourceType: { select: { code: true } },
      provider: { select: { slug: true, displayName: true } },
      lifecycleStatus: true,
      trustSignals: { include: { kind: true, status: true } }
    },
    orderBy: [{ lifecycleStatus: { sortOrder: "asc" } }, { updatedAt: "desc" }],
    take: 200
  });

  const projected: Row[] = rows.map((r) => ({
    id: r.id,
    airId: r.airId,
    slug: r.slug,
    title: r.title,
    kind: r.resourceType.code,
    provider: r.provider.displayName,
    providerSlug: r.provider.slug,
    status: deriveDisplayStatus({
      ...r,
      lifecycleStatus: r.lifecycleStatus,
      trustSignals: r.trustSignals
    }),
    lifecycle: r.lifecycleStatus.name,
    updatedAt: r.updatedAt.toISOString().slice(0, 10)
  }));

  const columns: Column<Row>[] = [
    {
      key: "title",
      label: "Title",
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
    { key: "provider", label: "Provider", render: (row) => row.provider, mono: false },
    { key: "lifecycle", label: "Lifecycle", render: (row) => row.lifecycle },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusPill status={row.status} />
    },
    { key: "updatedAt", label: "Updated", render: (row) => row.updatedAt, mono: true }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Resources</h1>
        <p className="p-subtitle">
          {projected.length} entries · MCP servers, agents, models and tools across every
          publisher.
        </p>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState="No resources yet — run npm run db:seed to populate the corpus."
        keyOf={(r) => r.id}
      />
    </div>
  );
}
