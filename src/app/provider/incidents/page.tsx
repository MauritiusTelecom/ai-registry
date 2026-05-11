import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/portals/DataTable";

export const metadata = { title: "Provider · Incidents" };
export const dynamic = "force-dynamic";

/**
 * Operator-driven enforcement actions targeting this provider's resources
 * or the provider record itself. Scoping invariant:
 *
 *   targetProviderId === user.provider.id
 *   OR targetResource.providerId === user.provider.id
 *
 * Public-safe projection: `internalNote` is NEVER surfaced here. Provider
 * sees the publicNote (operator-curated explanation) and the action type.
 */

type Row = {
  id: string;
  ts: string;
  action: string;
  target: string;
  targetSlug: string | null;
  reason: string;
  publicNote: string | null;
};

export default async function ProviderIncidentsPage() {
  const user = await getCurrentUser();
  const providerId = user?.provider?.id ?? null;

  if (!providerId) {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">Incidents</h1>
          <p className="p-subtitle">Your account isn't linked to a provider yet.</p>
        </div>
        <div className="p-empty">
          <div className="p-empty-text">No provider linkage on this account.</div>
        </div>
      </div>
    );
  }

  const rows = await prisma.enforcementAction.findMany({
    where: {
      OR: [
        { targetProviderId: providerId },
        { targetResource: { providerId } }
      ]
    },
    include: {
      actionType: { select: { name: true } },
      targetResource: { select: { slug: true, title: true } },
      targetProvider: { select: { displayName: true } }
    },
    orderBy: { performedAt: "desc" },
    take: 200
  });

  const projected: Row[] = rows.map((a) => ({
    id: a.id,
    ts: a.performedAt.toISOString().replace("T", " ").slice(0, 19),
    action: a.actionType.name,
    target: a.targetResource
      ? a.targetResource.title
      : a.targetProvider
        ? `Provider · ${a.targetProvider.displayName}`
        : "-",
    targetSlug: a.targetResource?.slug ?? null,
    reason: a.reason,
    publicNote: a.publicNote
  }));

  const columns: Column<Row>[] = [
    { key: "ts", label: "Performed", render: (row) => row.ts, mono: true },
    {
      key: "action",
      label: "Action",
      render: (row) => <span className="tag">{row.action}</span>
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
    { key: "reason", label: "Reason", render: (row) => <span style={{ color: "var(--text-2)" }}>{row.reason}</span> },
    {
      key: "note",
      label: "Public note",
      render: (row) => (row.publicNote ? <span style={{ color: "var(--text-2)" }}>{row.publicNote}</span> : "-")
    }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Incidents</h1>
        <p className="p-subtitle">
          Operator enforcement actions taken against {user?.provider?.displayName}'s
          resources or provider record. {projected.length} entr
          {projected.length === 1 ? "y" : "ies"} on record.
        </p>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState="No enforcement actions on record. Quiet is good."
        keyOf={(r) => r.id}
      />
      <p
        style={{
          marginTop: 18,
          fontSize: 12,
          color: "var(--text-3)",
          fontFamily: "IBM Plex Mono, monospace"
        }}
      >
        Internal operator notes are never surfaced here - only the public note attached
        to each action.
      </p>
    </div>
  );
}
