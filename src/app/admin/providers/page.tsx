import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";

export const metadata = { title: "Admin · Providers" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  slug: string;
  displayName: string;
  kind: string;
  status: string;
  jurisdiction: string;
  resources: number;
  contact: string;
  createdAt: string;
};

const STATUS_DISPLAY: Record<string, string> = {
  unverified: "experimental",
  verified: "verified",
  official_provider: "verified",
  suspended: "isolated"
};

export default async function AdminProvidersPage() {
  const rows = await prisma.provider.findMany({
    include: {
      type: { select: { code: true } },
      status: { select: { code: true, name: true } },
      homeJurisdiction: { select: { code: true } },
      _count: { select: { resources: true } }
    },
    orderBy: [{ status: { sortOrder: "asc" } }, { displayName: "asc" }],
    take: 200
  });

  const projected: Row[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    displayName: p.displayName,
    kind: p.type.code,
    status: STATUS_DISPLAY[p.status.code] ?? "active",
    jurisdiction: p.homeJurisdiction.code,
    resources: p._count.resources,
    contact: p.contactEmail,
    createdAt: p.createdAt.toISOString().slice(0, 10)
  }));

  const columns: Column<Row>[] = [
    {
      key: "name",
      label: "Provider",
      render: (row) => (
        <div>
          <div style={{ color: "var(--text)" }}>{row.displayName}</div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-3)",
              fontFamily: "IBM Plex Mono, monospace"
            }}
          >
            {row.slug}
          </div>
        </div>
      )
    },
    { key: "kind", label: "Type", render: (row) => <span className="tag">{row.kind}</span> },
    { key: "jurisdiction", label: "Region", render: (row) => row.jurisdiction, mono: true },
    { key: "resources", label: "Resources", render: (row) => row.resources, mono: true },
    { key: "contact", label: "Contact", render: (row) => row.contact, mono: true },
    { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
    { key: "createdAt", label: "Joined", render: (row) => row.createdAt, mono: true }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Providers</h1>
        <p className="p-subtitle">
          {projected.length} entities — sovereign, regional, private and external.
        </p>
      </div>
      <DataTable rows={projected} columns={columns} emptyState="No providers yet." keyOf={(r) => r.id} />
    </div>
  );
}
