import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/portals/DataTable";

export const metadata = { title: "Admin · Complaints" };
export const dynamic = "force-dynamic";

/**
 * Admin · Complaints - full operator inbox for public complaints.
 *
 * Unlike `/admin/flags` (which scopes to open / investigating only) this page
 * surfaces every complaint regardless of status so the operator can:
 *
 *   - view the complete record incl. complainant identity & contact email,
 *   - reply by email,
 *   - update status (open → investigating → resolved | rejected),
 *   - assign the complaint to a staff user, and
 *   - record a resolution summary on the audit trail.
 *
 * Filters: `?status=open|investigating|resolved|rejected|all` (default: all).
 */

type Row = {
  id: string;
  ts: string;
  type: string;
  severity: string;
  statusCode: string;
  statusName: string;
  target: string;
  targetSlug: string | null;
  complainant: string;
  complainantEmail: string | null;
  excerpt: string;
  assignedTo: string | null;
};

const SEVERITY_COLOUR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "var(--text-2)"
};

const STATUS_COLOUR: Record<string, string> = {
  open: "#f59e0b",
  investigating: "#3b82f6",
  resolved: "#22c55e",
  rejected: "var(--text-3)"
};

const ALLOWED_STATUS = ["open", "investigating", "resolved", "rejected", "all"] as const;
type StatusFilter = (typeof ALLOWED_STATUS)[number];

export default async function AdminComplaintsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const raw = (sp.status ?? "all").toLowerCase();
  const status: StatusFilter = (ALLOWED_STATUS as readonly string[]).includes(raw)
    ? (raw as StatusFilter)
    : "all";

  const rows = await prisma.complaint.findMany({
    where:
      status === "all"
        ? undefined
        : { status: { code: status } },
    include: {
      complaintType: { select: { name: true } },
      severity: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      targetResource: {
        select: { slug: true, title: true, provider: { select: { displayName: true } } }
      },
      targetProvider: { select: { slug: true, displayName: true } },
      assignedTo: { select: { name: true, email: true } }
    },
    orderBy: [{ status: { sortOrder: "asc" } }, { createdAt: "desc" }],
    take: 500
  });

  const projected: Row[] = rows.map((c) => {
    const target = c.targetResource
      ? `${c.targetResource.title} · ${c.targetResource.provider.displayName}`
      : c.targetProvider
        ? c.targetProvider.displayName
        : "-";
    return {
      id: c.id,
      ts: c.submittedAt.toISOString().slice(0, 10),
      type: c.complaintType.name,
      severity: c.severity.code,
      statusCode: c.status.code,
      statusName: c.status.name,
      target,
      targetSlug: c.targetResource?.slug ?? null,
      complainant: c.complainantName ?? (c.complainantEmail ?? "(anonymous)"),
      complainantEmail: c.complainantEmail,
      excerpt:
        c.description.length > 110 ? `${c.description.slice(0, 110)}…` : c.description,
      assignedTo: c.assignedTo ? c.assignedTo.name : null
    };
  });

  // Group counts for the filter chips - one query covers it; cheap.
  const allCounts = await prisma.complaint.groupBy({
    by: ["statusId"],
    _count: { _all: true }
  });
  const statusRefs = await prisma.complaintStatusType.findMany({
    select: { id: true, code: true, name: true }
  });
  const countsByCode: Record<string, number> = {};
  for (const r of allCounts) {
    const ref = statusRefs.find((s) => s.id === r.statusId);
    if (ref) countsByCode[ref.code] = r._count._all;
  }
  const totalAll = Object.values(countsByCode).reduce((a, b) => a + b, 0);

  const columns: Column<Row>[] = [
    { key: "ts", label: "Received", render: (row) => row.ts, mono: true, width: "110px" },
    { key: "type", label: "Type", render: (row) => <span className="tag">{row.type}</span> },
    {
      key: "severity",
      label: "Severity",
      render: (row) => (
        <span
          style={{ color: SEVERITY_COLOUR[row.severity] ?? "var(--text-2)", fontWeight: 500 }}
        >
          {row.severity}
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span style={{ color: STATUS_COLOUR[row.statusCode] ?? "var(--text-2)" }}>
          {row.statusName}
        </span>
      )
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
      key: "complainant",
      label: "From",
      render: (row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span>{row.complainant}</span>
          {row.complainantEmail ? (
            <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "var(--text-3)" }}>
              {row.complainantEmail}
            </span>
          ) : null}
        </div>
      )
    },
    {
      key: "excerpt",
      label: "Description",
      render: (row) => (
        <span style={{ color: "var(--text-2)" }}>{row.excerpt}</span>
      )
    },
    {
      key: "assigned",
      label: "Assigned",
      render: (row) =>
        row.assignedTo ? (
          row.assignedTo
        ) : (
          <span style={{ color: "var(--text-3)" }}>—</span>
        )
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <Link
          href={`/admin/complaints/${row.id}`}
          className="btn"
          style={{ padding: "4px 10px", fontSize: 12 }}
        >
          Open
        </Link>
      )
    }
  ];

  const tabs: { code: StatusFilter; label: string }[] = [
    { code: "all", label: "All" },
    { code: "open", label: "Open" },
    { code: "investigating", label: "Investigating" },
    { code: "resolved", label: "Resolved" },
    { code: "rejected", label: "Rejected" }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Complaints</h1>
        <p className="p-subtitle">
          Public complaints filed via the registry. View the full record, reply by email,
          assign, and move through the resolution workflow.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          {tabs.map((t) => {
            const isActive = t.code === status;
            const count = t.code === "all" ? totalAll : countsByCode[t.code] ?? 0;
            return (
              <Link
                key={t.code}
                href={t.code === "all" ? "/admin/complaints" : `/admin/complaints?status=${t.code}`}
                className={`tag ${isActive ? "active" : ""}`}
                style={{
                  textDecoration: "none",
                  padding: "4px 10px",
                  border: isActive ? "1px solid var(--text)" : "1px solid var(--border)",
                  background: isActive ? "var(--panel-strong, var(--panel))" : "transparent",
                  color: isActive ? "var(--text)" : "var(--text-2)",
                  fontSize: 12
                }}
              >
                {t.label} · <strong>{count}</strong>
              </Link>
            );
          })}
        </div>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState="No complaints match this filter."
        keyOf={(r) => r.id}
      />
    </div>
  );
}
