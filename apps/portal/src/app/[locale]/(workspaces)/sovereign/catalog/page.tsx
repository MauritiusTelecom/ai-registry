import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getConfig } from "@airegistry/sdk";
import { loadSovereignCatalog } from "@airegistry/sdk/server";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("sovereign.catalog");
}

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  airId: string | null;
  slug: string;
  title: string;
  kind: string;
  provider: string;
  bases: string[];
  status: string;
  lifecycle: string;
};

export default async function SovereignCatalogPage() {
  const t = await getTranslations("sovereign.catalog");
  const cfg = getConfig();

  const projected: Row[] = await loadSovereignCatalog(cfg.jurisdiction);

  const columns: Column<Row>[] = [
    {
      key: "title",
      label: t("columnResource"),
      render: (row) => (
        <div>
          <Link href={`/registry/${row.slug}`} style={{ color: "var(--text)", textDecoration: "none" }}>
            {row.title}
          </Link>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", fontFamily: "IBM Plex Mono, monospace" }}>
            {row.airId ?? t("noAirId")}
          </div>
        </div>
      )
    },
    { key: "kind", label: t("columnKind"), render: (row) => <span className="tag">{row.kind}</span> },
    { key: "provider", label: t("columnProvider"), render: (row) => row.provider },
    {
      key: "bases",
      label: t("columnSovereigntyBases"),
      render: (row) =>
        row.bases.length > 0 ? (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {row.bases.map((b) => (
              <span key={b} className="tag">{b}</span>
            ))}
          </div>
        ) : (
          "-"
        )
    },
    { key: "lifecycle", label: t("columnLifecycle"), render: (row) => row.lifecycle },
    { key: "status", label: t("columnStatus"), render: (row) => <StatusPill status={row.status} /> }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")} · {cfg.jurisdiction}</h1>
        <p className="p-subtitle">
          {t("subtitleText", { count: projected.length, jurisdiction: cfg.jurisdiction })}
        </p>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState={t("emptyState", { jurisdiction: cfg.jurisdiction })}
        keyOf={(r) => r.id}
      />
    </div>
  );
}
