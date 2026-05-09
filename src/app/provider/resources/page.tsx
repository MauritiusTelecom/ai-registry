import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { GatedPublishButton } from "@/components/portals/GatedPublishButton";
import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";
import { deriveDisplayStatus } from "@/lib/discovery/serializers";

export const metadata = { title: "Provider · Resources" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  airId: string | null;
  slug: string;
  title: string;
  kind: string;
  status: string;
  lifecycle: string;
  lifecycleCode: string;
  updatedAt: string;
};

export default async function ProviderResourcesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const providerId = user.provider?.id ?? null;

  if (!providerId) {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">Resources</h1>
          <p className="p-subtitle">
            Your account isn't linked to a provider yet. An operator must associate you with
            a provider before you can publish resources.
          </p>
        </div>
        <div className="p-empty">
          <div className="p-empty-text">No provider linkage on this account.</div>
        </div>
      </div>
    );
  }

  const rows = await prisma.resource.findMany({
    where: { providerId },
    include: {
      resourceType: { select: { code: true } },
      lifecycleStatus: true,
      trustSignals: { include: { kind: true, status: true } }
    },
    orderBy: [{ lifecycleStatus: { sortOrder: "asc" } }, { updatedAt: "desc" }]
  });

  const projected: Row[] = rows.map((r) => ({
    id: r.id,
    airId: r.airId,
    slug: r.slug,
    title: r.title,
    kind: r.resourceType.code,
    status: deriveDisplayStatus({
      ...r,
      lifecycleStatus: r.lifecycleStatus,
      trustSignals: r.trustSignals
    }),
    lifecycle: r.lifecycleStatus.name,
    lifecycleCode: r.lifecycleStatus.code,
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
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-3)",
              fontFamily: "IBM Plex Mono, monospace"
            }}
          >
            {row.airId ?? "(no AIR-ID — pre-listing)"}
          </div>
        </div>
      )
    },
    { key: "kind", label: "Kind", render: (row) => <span className="tag">{row.kind}</span> },
    { key: "lifecycle", label: "Lifecycle", render: (row) => row.lifecycle },
    { key: "status", label: "Public status", render: (row) => <StatusPill status={row.status} /> },
    { key: "updatedAt", label: "Updated", render: (row) => row.updatedAt, mono: true },
    {
      key: "actions",
      label: "",
      render: (row) =>
        row.lifecycleCode === "draft" || row.lifecycleCode === "needs_update" ? (
          <Link href={`/provider/resources/${row.id}/edit`} className="btn btn-secondary" style={{ fontSize: 13 }}>
            Edit / submit
          </Link>
        ) : row.lifecycleCode === "listed" ? (
          <Link href={`/registry/${row.slug}`} className="btn btn-secondary" style={{ fontSize: 13 }}>
            Public
          </Link>
        ) : (
          <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>
        )
    }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">My resources</h1>
        <p className="p-subtitle">
          {projected.length} resource{projected.length === 1 ? "" : "s"} under{" "}
          {user?.provider?.displayName ?? "this provider"}.
        </p>
        <div className="p-actions">
          <GatedPublishButton href="/provider/publish" canAuthorResources={user.canAuthorResources}>
            Publish new resource
          </GatedPublishButton>
        </div>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState="You haven't published any resources yet."
        keyOf={(r) => r.id}
      />
    </div>
  );
}
