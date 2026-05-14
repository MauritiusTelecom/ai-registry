"use client";

import Link from "next/link";
import { FilteredDataTable, type FilteredColumn } from "../FilteredDataTable";
import { StatusPill } from "../StatusPill";

export type ProviderResourceRow = {
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

type Props = {
  rows: ProviderResourceRow[];
  kinds: { code: string; name: string }[];
  lifecycles: { code: string; name: string }[];
};

export function ProviderResourcesGrid({ rows, kinds, lifecycles }: Props) {
  const columns: FilteredColumn<ProviderResourceRow>[] = [
    {
      key: "title",
      label: "Title",
      render: (row) => (
        <div>
          <Link
            href={`/registry/${row.slug}`}
            style={{ color: "var(--text)", textDecoration: "none" }}
          >
            {row.title}
          </Link>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-3)",
              fontFamily: "IBM Plex Mono, monospace"
            }}
          >
            {row.airId ?? "(no AIR-ID - pre-listing)"}
          </div>
        </div>
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
      label: "Public status",
      render: (row) => <StatusPill status={row.status} />
    },
    { key: "updatedAt", label: "Updated", render: (row) => row.updatedAt, mono: true },
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
      emptyState="You haven't published any resources yet."
      searchPlaceholder="Search title, AIR-ID, or slug…"
      searchableKeys={["title", "airId", "slug"]}
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
        },
        {
          key: "status",
          label: "Public status",
          options: [
            { value: "listed", label: "Listed" },
            { value: "draft", label: "Draft" },
            { value: "in_review", label: "In review" },
            { value: "needs_update", label: "Needs update" },
            { value: "suspended", label: "Suspended" },
            { value: "deprecated", label: "Deprecated" },
            { value: "removed", label: "Removed" }
          ]
        }
      ]}
    />
  );
}
