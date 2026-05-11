import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";

export const metadata = { title: "Provider · Complaints" };
export const dynamic = "force-dynamic";

/**
 * Complaints **directed at** this provider's resources or the provider record
 * itself. Scoping invariant - this page MUST never surface a complaint
 * targeting a different provider:
 *
 *   targetProviderId === user.provider.id
 *   OR targetResource.providerId === user.provider.id
 *
 * Public-safe projection: complainant name / email are NEVER surfaced here.
 * The provider sees only the redacted summary (type, severity, status,
 * description). The full record (with PII) lives in the admin portal.
 */

type Row = {
  id: string;
  ts: string;
  target: string;
  targetSlug: string | null;
  type: string;
  severity: string;
  status: string;
  excerpt: string;
};

const SEVERITY_DISPLAY: Record<string, string> = {
  low: "active",
  medium: "experimental",
  high: "isolated"
};

const STATUS_DISPLAY: Record<string, string> = {
  open: "experimental",
  investigating: "experimental",
  resolved: "verified",
  rejected: "isolated"
};

export default async function ProviderComplaintsPage() {
  const user = await getCurrentUser();
  const providerId = user?.provider?.id ?? null;

  if (!providerId) {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">Complaints</h1>
          <p className="p-subtitle">Your account isn't linked to a provider yet.</p>
        </div>
        <div className="p-empty">
          <div className="p-empty-text">No provider linkage on this account.</div>
        </div>
      </div>
    );
  }

  const rows = await prisma.complaint.findMany({
    where: {
      OR: [
        { targetProviderId: providerId },
        { targetResource: { providerId } }
      ]
    },
    include: {
      complaintType: { select: { name: true } },
      severity: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      targetResource: { select: { slug: true, title: true } },
      targetProvider: { select: { displayName: true } }
    },
    orderBy: [{ status: { sortOrder: "asc" } }, { createdAt: "desc" }],
    take: 200
  });

  const projected: Row[] = rows.map((c) => ({
    id: c.id,
    ts: c.submittedAt.toISOString().slice(0, 10),
    target: c.targetResource
      ? c.targetResource.title
      : c.targetProvider
        ? `Provider · ${c.targetProvider.displayName}`
        : "-",
    targetSlug: c.targetResource?.slug ?? null,
    type: c.complaintType.name,
    severity: SEVERITY_DISPLAY[c.severity.code] ?? "active",
    status: STATUS_DISPLAY[c.status.code] ?? "active",
    excerpt: c.description.length > 140 ? c.description.slice(0, 137) + "…" : c.description
  }));

  const openCount = projected.filter((r) => r.status === "experimental").length;

  const columns: Column<Row>[] = [
    { key: "ts", label: "Filed", render: (row) => row.ts, mono: true },
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
    {
      key: "severity",
      label: "Severity",
      render: (row) => <StatusPill status={row.severity} />
    },
    { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
    {
      key: "excerpt",
      label: "Excerpt",
      render: (row) => <span style={{ color: "var(--text-2)" }}>{row.excerpt}</span>
    }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Complaints</h1>
        <p className="p-subtitle">
          {projected.length} complaint{projected.length === 1 ? "" : "s"} directed at{" "}
          {user?.provider?.displayName ?? "this provider"}.
          {openCount > 0 ? ` ${openCount} still open.` : " None open."}
        </p>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState="No complaints filed against your provider or resources."
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
        Complainant identities are redacted on this surface. The full record (with PII)
        lives in the admin portal.
      </p>
    </div>
  );
}
