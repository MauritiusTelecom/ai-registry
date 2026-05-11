import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/portals/DataTable";

export const metadata = { title: "Admin · Flags" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  type: string;
  severity: string;
  status: string;
  target: string;
  targetSlug: string | null;
  description: string;
  reportedBy: string;
  receivedAt: string;
};

const SEVERITY_COLOUR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "var(--text-2)"
};

/**
 * Admin · Flags - operator-raised flags against resources and providers.
 *
 * The MVP schema does not carry a dedicated `Flag` model; instead public
 * complaints (`Complaint` rows whose status is open / investigating) ARE the
 * flag queue from the operator's perspective. Once admins triage one, it
 * either resolves or escalates to an `EnforcementAction`. Module spec is
 * `modules/admin/flags/product.md`.
 */
export default async function AdminFlagsPage() {
  const rows = await prisma.complaint.findMany({
    where: { status: { code: { in: ["open", "investigating"] } } },
    include: {
      complaintType: { select: { name: true } },
      severity: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      targetResource: {
        select: { slug: true, title: true, provider: { select: { displayName: true } } }
      },
      targetProvider: { select: { slug: true, displayName: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const projected: Row[] = rows.map((c) => {
    const target = c.targetResource
      ? `${c.targetResource.title} · ${c.targetResource.provider.displayName}`
      : c.targetProvider
        ? c.targetProvider.displayName
        : "-";
    return {
      id: c.id,
      type: c.complaintType.name,
      severity: c.severity.code,
      status: c.status.name,
      target,
      targetSlug: c.targetResource?.slug ?? null,
      description: c.description,
      // Public-safe projection - name/email never surface here.
      reportedBy: c.complainantName ? "(named)" : "(anonymous)",
      receivedAt: c.createdAt.toISOString().slice(0, 10)
    };
  });

  const counts = projected.reduce<Record<string, number>>((acc, r) => {
    acc[r.severity] = (acc[r.severity] ?? 0) + 1;
    return acc;
  }, {});

  const columns: Column<Row>[] = [
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
    { key: "status", label: "Status", render: (row) => row.status },
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
      key: "summary",
      label: "Description",
      render: (row) => (
        <span style={{ color: "var(--text-2)" }}>
          {row.description.length > 110 ? `${row.description.slice(0, 110)}…` : row.description}
        </span>
      )
    },
    { key: "by", label: "By", render: (row) => row.reportedBy, mono: true },
    { key: "at", label: "Received", render: (row) => row.receivedAt, mono: true }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Flags</h1>
        <p className="p-subtitle">
          {projected.length} open flag{projected.length === 1 ? "" : "s"} - public complaints in
          state <code>open</code> or <code>investigating</code>. Resolution lands on the audit log
          and may escalate to an enforcement action.
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
        emptyState="No open flags. Public complaints will appear here as they arrive."
        keyOf={(r) => r.id}
      />
    </div>
  );
}
