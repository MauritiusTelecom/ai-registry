import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/portals/DataTable";

export const metadata = { title: "Admin · Audit log" };
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
  const rows = await prisma.auditLog.findMany({
    include: {
      actor: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const projected: Row[] = rows.map((a) => ({
    id: a.id,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    actor: a.actor ? `${a.actor.name} (${a.actor.email})` : "system",
    ts: a.createdAt.toISOString().replace("T", " ").slice(0, 19)
  }));

  const columns: Column<Row>[] = [
    { key: "ts", label: "Timestamp", render: (row) => row.ts, mono: true },
    { key: "action", label: "Action", render: (row) => <span className="tag">{row.action}</span> },
    { key: "entity", label: "Entity", render: (row) => `${row.entityType} · ${row.entityId.slice(0, 8)}`, mono: true },
    { key: "actor", label: "Actor", render: (row) => row.actor }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Audit log</h1>
        <p className="p-subtitle">
          Append-only ledger of governance-relevant actions. Latest 200 entries shown.
        </p>
      </div>
      <DataTable rows={projected} columns={columns} emptyState="No audit entries yet." keyOf={(r) => r.id} />
    </div>
  );
}
