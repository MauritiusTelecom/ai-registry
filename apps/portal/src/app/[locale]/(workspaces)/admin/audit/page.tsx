import { getTranslations } from "next-intl/server";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { loadAdminAuditLog } from "@airegistry/sdk/server";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("admin.audit");
}

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: string;
  ts: string;
};

export default async function AdminAuditPage() {
  const t = await getTranslations("admin.audit");
  const raw = await loadAdminAuditLog({ limit: 200 });
  const projected: Row[] = raw.map((a) => ({
    id: a.id,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    actor: a.actorName ? `${a.actorName} (${a.actorEmail})` : t("system"),
    ts: a.ts
  }));

  const columns: Column<Row>[] = [
    { key: "ts", label: t("timestamp"), render: (row) => row.ts, mono: true },
    { key: "action", label: t("action"), render: (row) => <span className="tag">{row.action}</span> },
    { key: "entity", label: t("entity"), render: (row) => `${row.entityType} · ${row.entityId.slice(0, 8)}`, mono: true },
    { key: "actor", label: t("actor"), render: (row) => row.actor }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
      </div>
      <DataTable rows={projected} columns={columns} emptyState={t("noEntries")} keyOf={(r) => r.id} />
    </div>
  );
}
