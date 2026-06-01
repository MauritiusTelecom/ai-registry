"use client";

import { Link } from "@/i18n/navigation";
import { EntityGrid, type EntityColumn } from "@/components/library";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("providerComplaints");
  const columns: EntityColumn<ProviderComplaintRow>[] = [
    { key: "ts", label: t("colFiled"), render: (row) => row.ts, mono: true },
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
      key: "type",
      label: t("colType"),
      render: (row) => <span className="tag">{row.type}</span>
    },
    {
      key: "severity",
      label: t("colSeverity"),
      render: (row) => <StatusPill status={row.severity} />
    },
    {
      key: "status",
      label: t("colStatus"),
      render: (row) => <StatusPill status={row.status} />
    },
    {
      key: "excerpt",
      label: t("colExcerpt"),
      render: (row) => <span style={{ color: "var(--text-2)" }}>{row.excerpt}</span>
    }
  ];

  return (
    <EntityGrid
      rows={rows}
      columns={columns}
      emptyState={t("emptyState")}
      searchPlaceholder={t("searchPlaceholder")}
      searchableKeys={["target", "excerpt"]}
      filters={[
        {
          key: "type",
          label: t("colType"),
          options: types.map((ty) => ({ value: ty.name, label: ty.name }))
        },
        {
          key: "severity",
          label: t("colSeverity"),
          options: [
            { value: "active", label: t("severityLow") },
            { value: "experimental", label: t("severityMedium") },
            { value: "isolated", label: t("severityHigh") }
          ]
        },
        {
          key: "status",
          label: t("colStatus"),
          options: [
            { value: "experimental", label: t("statusOpen") },
            { value: "verified", label: t("statusResolved") },
            { value: "isolated", label: t("statusRejected") }
          ]
        }
      ]}
    />
  );
}
