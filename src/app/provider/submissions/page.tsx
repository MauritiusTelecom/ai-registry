import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { GatedPublishButton } from "@/components/portals/GatedPublishButton";
import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";
import { deriveDisplayStatus } from "@/lib/discovery/serializers";

export const metadata = { title: "Provider · Submissions" };
export const dynamic = "force-dynamic";

/**
 * Submissions = my resources whose lifecycle is one of
 * { draft, submitted, in_review, needs_update } — i.e. anything that hasn't
 * yet reached `listed`. This is the provider's view of "what's still in
 * flight".
 */

const PRE_LISTED = ["draft", "submitted", "in_review", "needs_update"] as const;

type Row = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  lifecycle: string;
  lifecycleCode: string;
  status: string;
  submittedAt: string | null;
  updatedAt: string;
};

export default async function ProviderSubmissionsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const providerId = user.provider?.id ?? null;

  if (!providerId) {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">Submissions</h1>
          <p className="p-subtitle">Your account isn't linked to a provider yet.</p>
        </div>
        <div className="p-empty">
          <div className="p-empty-text">No provider linkage on this account.</div>
        </div>
      </div>
    );
  }

  const rows = await prisma.resource.findMany({
    where: {
      providerId,
      lifecycleStatus: { code: { in: [...PRE_LISTED] } }
    },
    include: {
      resourceType: { select: { code: true } },
      lifecycleStatus: true,
      trustSignals: { include: { kind: true, status: true } }
    },
    orderBy: [{ lifecycleStatus: { sortOrder: "asc" } }, { updatedAt: "desc" }]
  });

  const projected: Row[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    kind: r.resourceType.code,
    lifecycle: r.lifecycleStatus.name,
    lifecycleCode: r.lifecycleStatus.code,
    status: deriveDisplayStatus({
      ...r,
      lifecycleStatus: r.lifecycleStatus,
      trustSignals: r.trustSignals
    }),
    submittedAt: r.submittedAt ? r.submittedAt.toISOString().slice(0, 10) : null,
    updatedAt: r.updatedAt.toISOString().slice(0, 10)
  }));

  const columns: Column<Row>[] = [
    {
      key: "title",
      label: "Title",
      render: (row) =>
        row.lifecycleCode === "listed" ? (
          <Link href={`/registry/${row.slug}`} style={{ color: "var(--text)", textDecoration: "none" }}>
            {row.title}
          </Link>
        ) : (
          <span style={{ fontWeight: 500 }}>{row.title}</span>
        )
    },
    { key: "kind", label: "Kind", render: (row) => <span className="tag">{row.kind}</span> },
    { key: "lifecycle", label: "Lifecycle", render: (row) => row.lifecycle },
    { key: "status", label: "Visual status", render: (row) => <StatusPill status={row.status} /> },
    { key: "submitted", label: "Submitted", render: (row) => row.submittedAt ?? "—", mono: true },
    { key: "updated", label: "Updated", render: (row) => row.updatedAt, mono: true },
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
        <h1 className="p-title">Submissions</h1>
        <p className="p-subtitle">
          {projected.length} resource{projected.length === 1 ? "" : "s"} not yet listed —
          drafts, in-review, or needs-update.
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
        emptyState="No in-flight submissions — all your resources are either listed or removed."
        keyOf={(r) => r.id}
      />
    </div>
  );
}
