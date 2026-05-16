"use client";

import Link from "next/link";
import { EntityGrid, type EntityColumn } from "@/components/library";
import { StatusPill } from "../StatusPill";

export type ProviderReviewRow = {
  id: string;
  target: string;
  targetSlug: string | null;
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
  const columns: EntityColumn<ProviderReviewRow>[] = [
    {
      key: "target",
      label: "Target",
      render: (row) =>
        row.targetSlug ? (
          <Link
            href={`/registry/${row.targetSlug}`}
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
    }
  ];

  return (
    <EntityGrid
      rows={rows}
      columns={columns}
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
