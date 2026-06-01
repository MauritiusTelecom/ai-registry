import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { loadVerifierQueue } from "@airegistry/sdk/server";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("verifier.queue");
}

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  resourceTitle: string;
  resourceSlug: string | null;
  provider: string;
  reviewType: string;
  status: string;
  startedAt: string | null;
  createdAt: string;
};

const STATUS_DISPLAY: Record<string, string> = {
  open: "experimental",
  in_review: "experimental",
  decided: "verified",
  withdrawn: "isolated"
};

export default async function VerifierQueuePage() {
  const t = await getTranslations("verifier.queue");
  const raw = await loadVerifierQueue();

  const projected: Row[] = raw.map((r) => ({
    id: r.id,
    resourceTitle: r.resourceTitle,
    resourceSlug: r.resourceSlug,
    provider: r.provider,
    reviewType: r.reviewType,
    status: STATUS_DISPLAY[r.statusCode] ?? "active",
    startedAt: r.startedAt,
    createdAt: r.createdAt
  }));

  const columns: Column<Row>[] = [
    {
      key: "title",
      label: t("colTarget"),
      render: (row) =>
        row.resourceSlug ? (
          <Link href={`/registry/${row.resourceSlug}`} style={{ color: "var(--text)", textDecoration: "none" }}>
            {row.resourceTitle}
          </Link>
        ) : (
          row.resourceTitle
        )
    },
    { key: "provider", label: t("colProvider"), render: (row) => row.provider },
    { key: "type", label: t("colReviewType"), render: (row) => <span className="tag">{row.reviewType}</span> },
    { key: "status", label: t("colStatus"), render: (row) => <StatusPill status={row.status} /> },
    { key: "started", label: t("colStarted"), render: (row) => row.startedAt ?? "-", mono: true },
    { key: "created", label: t("colQueued"), render: (row) => row.createdAt, mono: true },
    {
      key: "open",
      label: "",
      render: (row) => (
        <Link
          href={`/verifier/queue/${row.id}`}
          className="r-card-action-link"
          style={{ fontSize: 11 }}
        >
          {t("open")} →
        </Link>
      )
    }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">
          {t("subtitleCount", { count: projected.length })}
        </p>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState={t("emptyState")}
        keyOf={(r) => r.id}
      />
    </div>
  );
}
