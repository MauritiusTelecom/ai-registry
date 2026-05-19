"use client";

import Link from "next/link";
import { EntityGrid, type EntityColumn } from "@/components/library";

export type ProviderIncidentRow = {
  id: string;
  ts: string;
  action: string;
  target: string;
  targetSlug: string | null;
  reason: string;
  publicNote: string | null;
};

type Props = {
  rows: ProviderIncidentRow[];
  actionTypes: { name: string }[];
};

export function ProviderIncidentsGrid({ rows, actionTypes }: Props) {
  const columns: EntityColumn<ProviderIncidentRow>[] = [
    { key: "ts", label: "Performed", render: (row) => row.ts, mono: true },
    {
      key: "action",
      label: "Action",
      render: (row) => <span className="tag">{row.action}</span>
    },
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
      key: "reason",
      label: "Reason",
      render: (row) => <span style={{ color: "var(--text-2)" }}>{row.reason}</span>
    },
    {
      key: "note",
      label: "Public note",
      render: (row) =>
        row.publicNote ? (
          <span style={{ color: "var(--text-2)" }}>{row.publicNote}</span>
        ) : (
          "-"
        )
    }
  ];

  return (
    <EntityGrid
      rows={rows}
      columns={columns}
      emptyState="No enforcement actions on record. Quiet is good."
      searchPlaceholder="Search incidents by target or reason…"
      searchableKeys={["target", "reason", "publicNote"]}
      filters={[
        {
          key: "action",
          label: "Action",
          options: actionTypes.map((t) => ({ value: t.name, label: t.name }))
        }
      ]}
    />
  );
}
