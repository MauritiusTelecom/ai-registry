import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/portals/DataTable";

export const metadata = { title: "Verifier · Red team" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  type: string;
  severity: string;
  status: string;
  target: string;
  targetSlug: string | null;
  description: string;
  receivedAt: string;
};

const SEVERITY_COLOUR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "var(--text-2)"
};

/**
 * Verifier · Red team — adversarial findings against listed resources.
 *
 * The MVP schema does not yet model red-team campaigns as their own entity.
 * The closest existing signal is **public complaints filed against listed
 * resources with `type=safety`** — these are the user-driven adversarial
 * findings the verifier acts on. This page surfaces those rows, prioritised
 * by severity, until a dedicated `RedTeamCampaign` / `Finding` model lands.
 *
 * Module spec: `modules/verifier/redteam/product.md`.
 */
export default async function VerifierRedteamPage() {
  const findings = await prisma.complaint.findMany({
    where: {
      complaintType: { code: { in: ["safety", "policy"] } },
      targetResource: {
        lifecycleStatus: { code: { in: ["listed", "deprecated", "needs_update"] } }
      }
    },
    include: {
      complaintType: { select: { code: true, name: true } },
      severity: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      targetResource: {
        select: {
          slug: true,
          title: true,
          provider: { select: { displayName: true } }
        }
      }
    },
    orderBy: [{ severity: { sortOrder: "desc" } }, { createdAt: "desc" }],
    take: 200
  });

  const projected: Row[] = findings.map((c) => ({
    id: c.id,
    type: c.complaintType.name,
    severity: c.severity.code,
    status: c.status.name,
    target: c.targetResource
      ? `${c.targetResource.title} · ${c.targetResource.provider.displayName}`
      : "—",
    targetSlug: c.targetResource?.slug ?? null,
    description: c.description,
    receivedAt: c.createdAt.toISOString().slice(0, 10)
  }));

  const open = projected.filter((r) => r.status.toLowerCase() === "open").length;
  const high = projected.filter((r) => r.severity === "high").length;

  const columns: Column<Row>[] = [
    {
      key: "type",
      label: "Class",
      render: (row) => <span className="tag">{row.type}</span>
    },
    {
      key: "severity",
      label: "Severity",
      render: (row) => (
        <span style={{ color: SEVERITY_COLOUR[row.severity] ?? "var(--text-2)", fontWeight: 500 }}>
          {row.severity}
        </span>
      )
    },
    { key: "status", label: "Status", render: (row) => row.status },
    {
      key: "target",
      label: "Resource",
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
      label: "Finding",
      render: (row) => (
        <span style={{ color: "var(--text-2)" }}>
          {row.description.length > 120
            ? `${row.description.slice(0, 120)}…`
            : row.description}
        </span>
      )
    },
    { key: "received", label: "Received", render: (row) => row.receivedAt, mono: true }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Red team</h1>
        <p className="p-subtitle">
          {projected.length} adversarial finding{projected.length === 1 ? "" : "s"} ·{" "}
          <strong>{open}</strong> open · <strong>{high}</strong> high severity. Sourced from
          public complaints classified as <code>safety</code> or <code>policy</code> against listed
          resources. A dedicated red-team campaign model is in the spec backlog.
        </p>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState="No adversarial findings filed yet."
        keyOf={(r) => r.id}
      />
    </div>
  );
}
