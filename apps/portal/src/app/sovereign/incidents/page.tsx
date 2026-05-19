import Link from "next/link";
import { loadSovereignIncidents } from "@airegistry/sdk/server";
import { getConfig } from "@airegistry/sdk";
import { DataTable, type Column } from "@/components/portals/DataTable";

export const metadata = { title: "Sovereign · Incidents" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  actionType: string;
  reason: string;
  publicNote: string | null;
  target: string;
  targetSlug: string | null;
  performedAt: string;
  performedBy: string;
};

const SEVERITY_COLOUR: Record<string, string> = {
  warning: "var(--text-2)",
  isolate: "#f59e0b",
  suspend: "#ef4444",
  remove: "#dc2626"
};

export default async function SovereignIncidentsPage() {
  const cfg = getConfig();

  // Pull every enforcement action whose target (resource or provider) sits in
  // the configured sovereign jurisdiction. Sovereign view is jurisdictional -
  // operators outside the deployment's jurisdiction don't surface here.
  const raw = await loadSovereignIncidents(cfg.jurisdiction);

  const projected: Row[] = raw.map((e) => {
    return {
      id: e.id,
      actionType: e.actionType,
      reason: e.reason,
      publicNote: e.publicNote,
      target: e.target,
      targetSlug: e.targetSlug,
      performedAt: e.performedAt,
      performedBy: e.performedBy
    };
  });

  const counts = projected.reduce<Record<string, number>>((acc, r) => {
    acc[r.actionType] = (acc[r.actionType] ?? 0) + 1;
    return acc;
  }, {});

  const columns: Column<Row>[] = [
    {
      key: "type",
      label: "Action",
      render: (row) => {
        const code = row.actionType.toLowerCase();
        return (
          <span style={{ color: SEVERITY_COLOUR[code] ?? "var(--text)", fontWeight: 500 }}>
            {row.actionType}
          </span>
        );
      }
    },
    {
      key: "target",
      label: "Target",
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
      label: "Reason",
      render: (row) => (
        <span style={{ color: "var(--text-2)" }}>
          {row.reason.length > 110 ? `${row.reason.slice(0, 110)}…` : row.reason}
        </span>
      )
    },
    {
      key: "public",
      label: "Public note",
      render: (row) => (
        <span style={{ color: "var(--text-3)" }}>
          {row.publicNote
            ? row.publicNote.length > 80
              ? `${row.publicNote.slice(0, 80)}…`
              : row.publicNote
            : "-"}
        </span>
      )
    },
    { key: "by", label: "By", render: (row) => row.performedBy, mono: true },
    { key: "at", label: "When", render: (row) => row.performedAt, mono: true }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">National incidents</h1>
        <p className="p-subtitle">
          {projected.length} enforcement action{projected.length === 1 ? "" : "s"} taken against
          providers and resources in <strong>{cfg.jurisdiction}</strong>. Latest 200; older entries
          live in the audit log.
        </p>
        {Object.keys(counts).length > 0 ? (
          <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
            {Object.entries(counts).map(([k, n]) => (
              <span key={k} className="tag" style={{ fontSize: 12 }}>
                {k}: <strong>{n}</strong>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState={`No enforcement actions recorded for ${cfg.jurisdiction} yet.`}
        keyOf={(r) => r.id}
      />
    </div>
  );
}
