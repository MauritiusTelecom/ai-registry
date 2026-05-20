import Link from "next/link";
import { loadSovereignPartners } from "@airegistry/sdk/server";
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
  const raw = await loadSovereignPartners(cfg.jurisdiction);

  const projected: Row[] = raw.map((p) => ({
    id: p.id,
    slug: p.slug,
    displayName: p.displayName,
    kind: p.kind,
    status: STATUS_DISPLAY[p.statusCode] ?? "active",
    resources: p.resources,
    contact: p.contact,
    website: p.website,
    joined: p.joined
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
