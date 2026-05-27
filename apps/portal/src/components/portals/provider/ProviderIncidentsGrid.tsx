"use client";

import Link from "next/link";
import { EntityGrid, type EntityColumn } from "@/components/library";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("provider.incidents");
  const columns: EntityColumn<ProviderIncidentRow>[] = [
    { key: "ts", label: "Performed", render: (row) => row.ts, mono: true },
    {
      key: "action",
      label: t("colAction"),
      render: (row) => <span className="tag">{row.action}</span>
    },
    {
      key: "target",
      label: t("colTarget"),
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
      label: t("colReason"),
      render: (row) => <span style={{ color: "var(--text-2)" }}>{row.reason}</span>
    },
    {
      key: "note",
      label: t("colPublicNote"),
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
          label: t("colAction"),
          options: actionTypes.map((at) => ({ value: at.name, label: at.name }))
        }
      ]}
    />
  );
}
