"use client";

import Link from "next/link";
import { Button, EntityGrid, type EntityColumn } from "@/components/library";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("provider.submissions");
  const columns: EntityColumn<ProviderSubmissionRow>[] = [
    {
      key: "title",
      label: t("colTitle"),
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
      label: t("colKind"),
      render: (row) => <span className="tag">{row.kind}</span>
    },
    { key: "lifecycle", label: t("colLifecycle"), render: (row) => row.lifecycle },
    {
      key: "status",
      label: t("colVisualStatus"),
      render: (row) => <StatusPill status={row.status} />
    },
    {
      key: "submitted",
      label: t("colSubmitted"),
      render: (row) => row.submittedAt ?? "-",
      mono: true
    },
    { key: "updated", label: t("colUpdated"), render: (row) => row.updatedAt, mono: true },
    {
      key: "actions",
      label: "",
      render: (row) =>
        row.lifecycleCode === "draft" || row.lifecycleCode === "needs_update" ? (
          <Button
            href={`/provider/resources/${row.id}/edit`}
            intent="secondary"
            size="sm"
          >
Edit / submit
          </Button>
        ) : row.lifecycleCode === "listed" ? (
          <Button
            href={`/registry/${row.slug}`}
            intent="secondary"
            size="sm"
          >
Public
          </Button>
        ) : (
          <span style={{ color: "var(--text-3)", fontSize: 12 }}>-</span>
        )
    }
  ];

  return (
    <EntityGrid
      rows={rows}
      columns={columns}
      emptyState="No in-flight submissions — all your resources are either listed or removed."
      searchPlaceholder="Search submissions by title or slug…"
      searchableKeys={["title", "slug"]}
      filters={[
        {
          key: "kind",
          label: t("colKind"),
          options: kinds.map((k) => ({ value: k.code, label: k.name }))
        },
        {
          key: "lifecycleCode",
          label: t("colLifecycle"),
          options: lifecycles.map((l) => ({ value: l.code, label: l.name }))
        }
      ]}
    />
  );
}
