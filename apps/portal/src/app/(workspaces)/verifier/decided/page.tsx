import Link from "next/link";
import { loadVerifierDecided } from "@airegistry/sdk/server";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";

export const metadata = { title: "Verifier · Decided" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  resourceTitle: string;
  resourceSlug: string | null;
  provider: string;
  reviewType: string;
  decision: string;
  decisionSummary: string;
  reviewer: string;
  completedAt: string | null;
};

const DECISION_DISPLAY: Record<string, string> = {
  decided: "verified",
  withdrawn: "isolated"
};

export default async function VerifierDecidedPage() {
  const raw = await loadVerifierDecided();

  const projected: Row[] = raw.map((r) => ({
    id: r.id,
    resourceTitle: r.resourceTitle,
    resourceSlug: r.resourceSlug,
    provider: r.provider,
    reviewType: r.reviewType,
    decision: DECISION_DISPLAY[r.statusCode] ?? "active",
    decisionSummary: r.decisionSummary,
    reviewer: r.reviewer,
    completedAt: r.completedAt
  }));

  const columns: Column<Row>[] = [
    {
      key: "title",
      label: "Target",
      render: (row) =>
        row.resourceSlug ? (
          <Link
            href={`/registry/${row.resourceSlug}`}
            style={{ color: "var(--text)", textDecoration: "none" }}
          >
            {row.resourceTitle}
          </Link>
        ) : (
          row.resourceTitle
        )
    },
    { key: "provider", label: "Provider", render: (row) => row.provider },
    {
      key: "type",
      label: "Review type",
      render: (row) => <span className="tag">{row.reviewType}</span>
    },
    {
      key: "decision",
      label: "Outcome",
      render: (row) => <StatusPill status={row.decision} />
    },
    {
      key: "summary",
      label: "Summary",
      render: (row) => (
        <span style={{ color: "var(--text-2)" }}>
          {row.decisionSummary.length > 90
            ? `${row.decisionSummary.slice(0, 90)}…`
            : row.decisionSummary}
        </span>
      )
    },
    { key: "reviewer", label: "Reviewer", render: (row) => row.reviewer, mono: true },
    {
      key: "completed",
      label: "Decided",
      render: (row) => row.completedAt ?? "-",
      mono: true
    }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Decided reviews</h1>
        <p className="p-subtitle">
          {projected.length} review{projected.length === 1 ? "" : "s"} closed (latest 200) - every
          row is append-only and mirrors the audit trail.
        </p>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState="No reviews have been decided yet."
        keyOf={(r) => r.id}
      />
    </div>
  );
}
