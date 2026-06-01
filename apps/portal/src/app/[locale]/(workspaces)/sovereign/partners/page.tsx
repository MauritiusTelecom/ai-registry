import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { loadSovereignPartners } from "@airegistry/sdk/server";
import { getConfig } from "@airegistry/sdk";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("sovereign.partners");
}

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  slug: string;
  displayName: string;
  kind: string;
  status: string;
  resources: number;
  contact: string;
  website: string | null;
  joined: string;
};

const STATUS_DISPLAY: Record<string, string> = {
  unverified: "experimental",
  verified: "verified",
  official_provider: "trusted",
  suspended: "isolated"
};

export default async function SovereignPartnersPage() {
  const t = await getTranslations("sovereign.partners");
  const cfg = getConfig();

  // Sovereign partners == all providers anchored in the deployment's home
  // jurisdiction. Public registry gates remain (admin-suspended providers
  // are surfaced here so the operator can act on them).
  const raw = await loadSovereignPartners(cfg.jurisdiction);

  const projected: Row[] = raw.map((p) => ({
    id: p.id,
    slug: p.slug,
    displayName: p.displayName,
    kind: p.kind,
    status: STATUS_DISPLAY[p.statusCode] ?? "active",
    resources: p.resources,
    contact: p.contact,
    website: p.website,
    joined: p.joined
  }));

  const verified = projected.filter((r) => r.status === "verified" || r.status === "trusted").length;
  const totalResources = projected.reduce((acc, r) => acc + r.resources, 0);

  const columns: Column<Row>[] = [
    {
      key: "name",
      label: t("columnPartner"),
      render: (row) => (
        <div>
          <div style={{ color: "var(--text)" }}>{row.displayName}</div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-3)",
              fontFamily: "IBM Plex Mono, monospace"
            }}
          >
            {row.slug}
          </div>
        </div>
      )
    },
    { key: "kind", label: t("columnType"), render: (row) => <span className="tag">{row.kind}</span> },
    { key: "resources", label: t("columnResources"), render: (row) => row.resources, mono: true },
    {
      key: "status",
      label: t("columnStatus"),
      render: (row) => <StatusPill status={row.status} />
    },
    { key: "contact", label: t("columnContact"), render: (row) => row.contact, mono: true },
    {
      key: "site",
      label: t("columnWebsite"),
      render: (row) =>
        row.website ? (
          <Link
            href={row.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-2)" }}
          >
            {row.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </Link>
        ) : (
          <span style={{ color: "var(--text-3)" }}>-</span>
        )
    },
    { key: "joined", label: t("columnJoined"), render: (row) => row.joined, mono: true }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">
          {t.rich("subtitleText", {
            count: projected.length,
            jurisdiction: cfg.jurisdiction,
            verified,
            resources: totalResources,
            bold: (chunks) => <strong>{chunks}</strong>
          })}
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
