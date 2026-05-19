import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@airegistry/sdk";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";

export const metadata = { title: "Sovereign · Partners" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  slug: string;
  displayName: string;
  kind: string;
  status: string;
  resources: number;
  contact: string;
  website: string | null;
  joined: string;
};

const STATUS_DISPLAY: Record<string, string> = {
  unverified: "experimental",
  verified: "verified",
  official_provider: "trusted",
  suspended: "isolated"
};

export default async function SovereignPartnersPage() {
  const cfg = getConfig();

  // Sovereign partners == all providers anchored in the deployment's home
  // jurisdiction. Public registry gates remain (admin-suspended providers
  // are surfaced here so the operator can act on them).
  const rows = await prisma.provider.findMany({
    where: { homeJurisdiction: { code: cfg.jurisdiction } },
    include: {
      type: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      _count: { select: { resources: true } }
    },
    orderBy: [{ status: { sortOrder: "asc" } }, { displayName: "asc" }],
    take: 200
  });

  const projected: Row[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    displayName: p.displayName,
    kind: p.type.name,
    status: STATUS_DISPLAY[p.status.code] ?? "active",
    resources: p._count.resources,
    contact: p.contactEmail,
    website: p.websiteUrl,
    joined: p.createdAt.toISOString().slice(0, 10)
  }));

  const verified = projected.filter((r) => r.status === "verified" || r.status === "trusted").length;
  const totalResources = projected.reduce((acc, r) => acc + r.resources, 0);

  const columns: Column<Row>[] = [
    {
      key: "name",
      label: "Partner",
      render: (row) => (
        <div>
          <div style={{ color: "var(--text)" }}>{row.displayName}</div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-3)",
              fontFamily: "IBM Plex Mono, monospace"
            }}
          >
            {row.slug}
          </div>
        </div>
      )
    },
    { key: "kind", label: "Type", render: (row) => <span className="tag">{row.kind}</span> },
    { key: "resources", label: "Resources", render: (row) => row.resources, mono: true },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusPill status={row.status} />
    },
    { key: "contact", label: "Contact", render: (row) => row.contact, mono: true },
    {
      key: "site",
      label: "Website",
      render: (row) =>
        row.website ? (
          <Link
            href={row.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-2)" }}
          >
            {row.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </Link>
        ) : (
          <span style={{ color: "var(--text-3)" }}>-</span>
        )
    },
    { key: "joined", label: "Joined", render: (row) => row.joined, mono: true }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Partners</h1>
        <p className="p-subtitle">
          {projected.length} provider{projected.length === 1 ? "" : "s"} anchored in{" "}
          <strong>{cfg.jurisdiction}</strong> · {verified} verified · {totalResources} resource
          {totalResources === 1 ? "" : "s"} between them.
        </p>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState={`No partners registered in ${cfg.jurisdiction} yet.`}
        keyOf={(r) => r.id}
      />
    </div>
  );
}
