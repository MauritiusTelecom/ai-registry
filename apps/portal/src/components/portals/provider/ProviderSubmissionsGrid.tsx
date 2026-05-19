"use client";

import Link from "next/link";
import { FilteredDataTable, type FilteredColumn } from "../FilteredDataTable";
import { StatusPill } from "../StatusPill";

export type ProviderSubmissionRow = {
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

type Props = {
  rows: ProviderSubmissionRow[];
  kinds: { code: string; name: string }[];
  lifecycles: { code: string; name: string }[];
};

export function ProviderSubmissionsGrid({ rows, kinds, lifecycles }: Props) {
  const columns: FilteredColumn<ProviderSubmissionRow>[] = [
    {
      key: "title",
      label: "Title",
      render: (row) =>
        row.lifecycleCode === "listed" ? (
          <Link
            href={`/registry/${row.slug}`}
            style={{ color: "var(--text)", textDecoration: "none" }}
          >
            {row.title}
          </Link>
        ) : (
          <span style={{ fontWeight: 500 }}>{row.title}</span>
        )
    },
    {
      key: "kind",
      label: "Kind",
      render: (row) => <span className="tag">{row.kind}</span>
    },
    { key: "lifecycle", label: "Lifecycle", render: (row) => row.lifecycle },
    {
      key: "status",
      label: "Visual status",
      render: (row) => <StatusPill status={row.status} />
    },
    {
      key: "submitted",
      label: "Submitted",
      render: (row) => row.submittedAt ?? "-",
      mono: true
    },
    { key: "updated", label: "Updated", render: (row) => row.updatedAt, mono: true },
    {
      key: "actions",
      label: "",
      render: (row) =>
        row.lifecycleCode === "draft" || row.lifecycleCode === "needs_update" ? (
          <Link
            href={`/provider/resources/${row.id}/edit`}
            className="btn btn-secondary"
            style={{ fontSize: 13 }}
          >
            Edit / submit
          </Link>
        ) : row.lifecycleCode === "listed" ? (
          <Link
            href={`/registry/${row.slug}`}
            className="btn btn-secondary"
            style={{ fontSize: 13 }}
          >
            Public
          </Link>
        ) : (
          <span style={{ color: "var(--text-3)", fontSize: 12 }}>-</span>
        )
    }
  ];

  return (
    <FilteredDataTable
      rows={rows}
      columns={columns}
      keyOf={(r) => r.id}
      emptyState="No in-flight submissions — all your resources are either listed or removed."
      searchPlaceholder="Search submissions by title or slug…"
      searchableKeys={["title", "slug"]}
      filters={[
        {
          key: "kind",
          label: "Kind",
          options: kinds.map((k) => ({ value: k.code, label: k.name }))
        },
        {
          key: "lifecycleCode",
          label: "Lifecycle",
          options: lifecycles.map((l) => ({ value: l.code, label: l.name }))
        }
      ]}
    />
  );
}
