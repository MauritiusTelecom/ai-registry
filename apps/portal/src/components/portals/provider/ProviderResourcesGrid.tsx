"use client";

import { Link } from "@/i18n/navigation";
import { EntityGrid, Icon, type EntityColumn } from "@/components/library";
import { useTranslations } from "next-intl";
import { StatusPill } from "../StatusPill";

const iconBtnStyle = {
  padding: "4px 6px",
  minWidth: 28,
  justifyContent: "center",
  color: "var(--text)"
} as const;

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
  const t = useTranslations("providerResources");
  const columns: EntityColumn<ProviderResourceRow>[] = [
    {
      key: "title",
      label: t("colTitle"),
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
            {row.airId ?? t("noAirId")}
          </div>
        </div>
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
      label: t("colPublicStatus"),
      render: (row) => <StatusPill status={row.status} />
    },
    { key: "updatedAt", label: t("colUpdated"), render: (row) => row.updatedAt, mono: true },
    {
      key: "actions",
      label: "",
      render: (row) => {
        const editable =
          row.lifecycleCode === "draft" ||
          row.lifecycleCode === "needs_update" ||
          row.lifecycleCode === "listed";
        return (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {row.airId ? (
              <Link
                href={`/registry/${row.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="r-card-action-link"
                title={t("public")}
                aria-label={t("public")}
                style={iconBtnStyle}
              >
                <Icon name="eye" size={14} />
              </Link>
            ) : null}
            {editable ? (
              <Link
                href={`/provider/resources/${row.id}/edit`}
                className="r-card-action-link"
                title={t("editSubmit")}
                aria-label={t("editSubmit")}
                style={iconBtnStyle}
              >
                <Icon name="edit" size={14} />
              </Link>
            ) : null}
            {!row.airId && !editable ? (
              <span style={{ color: "var(--text-3)", fontSize: 12 }}>-</span>
            ) : null}
          </div>
        );
      }
    }
  ];

  return (
    <EntityGrid
      rows={rows}
      columns={columns}
      emptyState={t("emptyState")}
      searchPlaceholder={t("searchPlaceholder")}
      searchableKeys={["title", "airId", "slug"]}
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
        },
        {
          // `status` here holds the derived public DisplayStatus produced by
          // `deriveDisplayStatus` — NOT the lifecycle code (that's `lifecycleCode`).
          // Option values must therefore be the display strings the function
          // returns: "verified" | "trusted" | "active" | "experimental" | "isolated".
          key: "status",
          label: t("colPublicStatus"),
          options: [
            { value: "verified", label: t("statusVerified") },
            { value: "trusted", label: t("statusTrusted") },
            { value: "active", label: t("statusActive") },
            { value: "experimental", label: t("statusExperimental") },
            { value: "isolated", label: t("statusIsolated") }
          ]
        }
      ]}
    />
  );
}
