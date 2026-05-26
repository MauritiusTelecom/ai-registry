"use client";

import Link from "next/link";
import { FilteredDataTable, type FilteredColumn } from "../FilteredDataTable";
import { StatusPill } from "../StatusPill";

export type ProviderReviewRow = {
  id: string;
  target: string;
  targetSlug: string | null;
  targetResourceId: string | null;
  type: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  decisionSummary: string | null;
};

type Props = {
  rows: ProviderReviewRow[];
  types: { name: string }[];
};

export function ProviderReviewsGrid({ rows, types }: Props) {
  const columns: FilteredColumn<ProviderReviewRow>[] = [
    {
      key: "target",
      label: "Target",
      // Link to the provider's editable resource page (works for any
      // lifecycle state). The public /registry/[slug] page 404s for
      // non-listed resources, which is what owners hit if we link there.
      render: (row) =>
        row.targetResourceId ? (
          <Link
            href={`/provider/resources/${row.targetResourceId}/edit`}
            style={{ color: "var(--text)", textDecoration: "none" }}
          >
            {row.target}
          </Link>
        ) : (
          row.target
        )
    },
    {
      key: "type",
      label: "Type",
      render: (row) => <span className="tag">{row.type}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusPill status={row.status} />
    },
    { key: "started", label: "Started", render: (row) => row.startedAt ?? "-", mono: true },
    {
      key: "completed",
      label: "Completed",
      render: (row) => row.completedAt ?? "-",
      mono: true
    },
    {
      key: "summary",
      label: "Decision",
      render: (row) =>
        row.decisionSummary ? (
          <span style={{ color: "var(--text-2)" }}>{row.decisionSummary}</span>
        ) : (
          "-"
        )
    },
    {
      key: "thread",
      label: "Conversation",
      render: (row) => (
        <Link
          href={`/provider/reviews/${row.id}`}
          className="r-card-action-link"
          style={{ fontSize: 11 }}
        >
          Open →
        </Link>
      )
    }
  ];

  return (
    <FilteredDataTable
      rows={rows}
      columns={columns}
      keyOf={(r) => r.id}
      emptyState="No reviews of your resources yet."
      searchPlaceholder="Search reviews by target or decision summary…"
      searchableKeys={["target", "decisionSummary"]}
      filters={[
        {
          key: "type",
          label: "Type",
          options: types.map((t) => ({ value: t.name, label: t.name }))
        },
        {
          key: "status",
          label: "Status",
          options: [
            { value: "verified", label: "Decided" },
            { value: "experimental", label: "In flight" },
            { value: "isolated", label: "Withdrawn" }
          ]
        }
      ]}
    />
  );
}
