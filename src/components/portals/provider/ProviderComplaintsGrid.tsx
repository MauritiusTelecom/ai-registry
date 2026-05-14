"use client";

import Link from "next/link";
import { FilteredDataTable, type FilteredColumn } from "../FilteredDataTable";
import { StatusPill } from "../StatusPill";

export type ProviderComplaintRow = {
  id: string;
  ts: string;
  target: string;
  targetSlug: string | null;
  type: string;
  severity: string;
  status: string;
  excerpt: string;
};

type Props = {
  rows: ProviderComplaintRow[];
  types: { name: string }[];
};

export function ProviderComplaintsGrid({ rows, types }: Props) {
  const columns: FilteredColumn<ProviderComplaintRow>[] = [
    { key: "ts", label: "Filed", render: (row) => row.ts, mono: true },
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
      key: "severity",
      label: "Severity",
      render: (row) => <StatusPill status={row.severity} />
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusPill status={row.status} />
    },
    {
      key: "excerpt",
      label: "Excerpt",
      render: (row) => <span style={{ color: "var(--text-2)" }}>{row.excerpt}</span>
    }
  ];

  return (
    <FilteredDataTable
      rows={rows}
      columns={columns}
      keyOf={(r) => r.id}
      emptyState="No complaints filed against your provider or resources."
      searchPlaceholder="Search complaints by target or text excerpt…"
      searchableKeys={["target", "excerpt"]}
      filters={[
        {
          key: "type",
          label: "Type",
          options: types.map((t) => ({ value: t.name, label: t.name }))
        },
        {
          key: "severity",
          label: "Severity",
          options: [
            { value: "active", label: "Low" },
            { value: "experimental", label: "Medium" },
            { value: "isolated", label: "High" }
          ]
        },
        {
          key: "status",
          label: "Status",
          options: [
            { value: "experimental", label: "Open / Investigating" },
            { value: "verified", label: "Resolved" },
            { value: "isolated", label: "Rejected" }
          ]
        }
      ]}
    />
  );
}
