import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";

export const metadata = { title: "Provider · Reviews" };
export const dynamic = "force-dynamic";

/**
 * Reviews of this provider's resources or the provider record itself.
 * Scoping invariant:
 *
 *   providerId === user.provider.id
 *   OR resource.providerId === user.provider.id
 *
 * Public-safe projection: `internalNotes` and reviewer email are NEVER
 * surfaced here. Decision summaries are always shown; conditions only when
 * the review is decided.
 */

type Row = {
  id: string;
  target: string;
  targetSlug: string | null;
  type: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  decisionSummary: string | null;
};

const STATUS_DISPLAY: Record<string, string> = {
  open: "experimental",
  in_review: "experimental",
  decided: "verified",
  withdrawn: "isolated"
};

export default async function ProviderReviewsPage() {
  const user = await getCurrentUser();
  const providerId = user?.provider?.id ?? null;

  if (!providerId) {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">Reviews</h1>
          <p className="p-subtitle">Your account isn't linked to a provider yet.</p>
        </div>
        <div className="p-empty">
          <div className="p-empty-text">No provider linkage on this account.</div>
        </div>
      </div>
    );
  }

  const rows = await prisma.review.findMany({
    where: {
      OR: [
        { providerId },
        { resource: { providerId } }
      ]
    },
    include: {
      reviewType: { select: { name: true } },
      status: { select: { code: true, name: true } },
      resource: { select: { slug: true, title: true } }
    },
    orderBy: [{ status: { sortOrder: "asc" } }, { createdAt: "desc" }],
    take: 200
  });

  const projected: Row[] = rows.map((r) => ({
    id: r.id,
    target: r.resource?.title ?? "Provider record",
    targetSlug: r.resource?.slug ?? null,
    type: r.reviewType.name,
    status: STATUS_DISPLAY[r.status.code] ?? "active",
    startedAt: r.startedAt ? r.startedAt.toISOString().slice(0, 10) : null,
    completedAt: r.completedAt ? r.completedAt.toISOString().slice(0, 10) : null,
    decisionSummary: r.decisionSummary
  }));

  const openCount = projected.filter((r) => r.status === "experimental").length;

  const columns: Column<Row>[] = [
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
    { key: "type", label: "Type", render: (row) => <span className="tag">{row.type}</span> },
    { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
    { key: "started", label: "Started", render: (row) => row.startedAt ?? "—", mono: true },
    { key: "completed", label: "Completed", render: (row) => row.completedAt ?? "—", mono: true },
    {
      key: "summary",
      label: "Decision",
      render: (row) =>
        row.decisionSummary ? (
          <span style={{ color: "var(--text-2)" }}>{row.decisionSummary}</span>
        ) : (
          "—"
        )
    }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Reviews</h1>
        <p className="p-subtitle">
          {projected.length} review{projected.length === 1 ? "" : "s"} of{" "}
          {user?.provider?.displayName}'s resources or provider record.
          {openCount > 0 ? ` ${openCount} still in flight.` : ""}
        </p>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState="No reviews of your resources yet."
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
        Internal reviewer notes are never shown here. Provider sees decision summary only.
      </p>
    </div>
  );
}
