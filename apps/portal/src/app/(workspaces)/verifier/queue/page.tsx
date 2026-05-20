import Link from "next/link";
import { loadVerifierQueue } from "@airegistry/sdk/server";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";

export const metadata = { title: "Verifier · Queue" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  resourceTitle: string;
  resourceSlug: string | null;
  provider: string;
  reviewType: string;
  status: string;
  startedAt: string | null;
  createdAt: string;
};

const STATUS_DISPLAY: Record<string, string> = {
  open: "experimental",
  in_review: "experimental",
  decided: "verified",
  withdrawn: "isolated"
};

export default async function VerifierQueuePage() {
  const raw = await loadVerifierQueue();

  const projected: Row[] = raw.map((r) => ({
    id: r.id,
    resourceTitle: r.resourceTitle,
    resourceSlug: r.resourceSlug,
    provider: r.provider,
    reviewType: r.reviewType,
    status: STATUS_DISPLAY[r.statusCode] ?? "active",
    startedAt: r.startedAt,
    createdAt: r.createdAt
  }));

  const columns: Column<Row>[] = [
    {
      key: "title",
      label: "Target",
      render: (row) =>
        row.resourceSlug ? (
          <Link href={`/registry/${row.resourceSlug}`} style={{ color: "var(--text)", textDecoration: "none" }}>
            {row.resourceTitle}
          </Link>
        ) : (
          row.resourceTitle
        )
    },
    { key: "provider", label: "Provider", render: (row) => row.provider },
    { key: "type", label: "Review type", render: (row) => <span className="tag">{row.reviewType}</span> },
    { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
    { key: "started", label: "Started", render: (row) => row.startedAt ?? "-", mono: true },
    { key: "created", label: "Queued", render: (row) => row.createdAt, mono: true }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Review queue</h1>
        <p className="p-subtitle">
          {projected.length} review{projected.length === 1 ? "" : "s"} awaiting the §11 checklist.
        </p>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState="The queue is empty - every review has been decided or withdrawn."
        keyOf={(r) => r.id}
      />
    </div>
  );
}
