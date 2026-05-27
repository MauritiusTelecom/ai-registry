"use client";

import Link from "next/link";
import { EntityGrid, type EntityColumn } from "@/components/library";
import { useTranslations } from "next-intl";
import { FilteredDataTable, type FilteredColumn } from "../FilteredDataTable";
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
      key: "status",
      label: t("colStatus"),
      render: (row) => <StatusPill status={row.status} />
    },
    { key: "started", label: t("colStarted"), render: (row) => row.startedAt ?? "-", mono: true },
    {
      key: "completed",
      label: t("colCompleted"),
      render: (row) => row.completedAt ?? "-",
      mono: true
    },
    {
      key: "summary",
      label: t("colDecision"),
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
    <EntityGrid
      rows={rows}
      columns={columns}
emptyState="No reviews of your resources yet."
      searchPlaceholder="Search reviews by target or decision summary…"
      searchableKeys={["target", "decisionSummary"]}
      filters={[
        {
          key: "type",
          label: t("colType"),
          options: types.map((ty) => ({ value: ty.name, label: ty.name }))
        },
        {
          key: "status",
          label: t("colStatus"),
          options: [
            { value: "verified", label: t("statusDecided") },
            { value: "experimental", label: t("statusInFlight") },
            { value: "isolated", label: t("statusWithdrawn") }
          ]
        }
      ]}
    />
  );
}
