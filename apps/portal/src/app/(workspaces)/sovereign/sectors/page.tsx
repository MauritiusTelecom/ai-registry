import { getConfig } from "@airegistry/sdk";
import {
  listReferenceTable,
  loadSovereignSectorMemberships
} from "@airegistry/sdk/server";
import { DataTable, type Column } from "@/components/portals/DataTable";

export const metadata = { title: "Sovereign · Sectors" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  code: string;
  name: string;
  description: string;
  total: number;
  listed: number;
  models: number;
  agents: number;
  tools: number;
  skills: number;
};

export default async function SovereignSectorsPage() {
  const cfg = getConfig();

  // Pull all sectors plus the per-sector resource membership (filtered to the
  // sovereign jurisdiction), then count by lifecycle + kind. Each Resource
  // joins ResourceSector on `sectorId`; we walk that index.
  const [sectors, memberships] = await Promise.all([
    listReferenceTable("sector", { orderBy: "name" }),
    loadSovereignSectorMemberships(cfg.jurisdiction)
  ]);

  const buckets = new Map<string, { total: number; listed: number; models: number; agents: number; tools: number; skills: number }>();
  for (const s of sectors) {
    buckets.set(s.id, { total: 0, listed: 0, models: 0, agents: 0, tools: 0, skills: 0 });
  }
  for (const m of memberships) {
    const b = buckets.get(m.sectorId);
    if (!b) continue;
    b.total += 1;
    if (m.resourceLifecycleCode === "listed") b.listed += 1;
    const k = m.resourceTypeCode;
    if (k === "model") b.models += 1;
    else if (k === "agent") b.agents += 1;
    else if (k === "tool") b.tools += 1;
    else if (k === "skill") b.skills += 1;
  }

  const projected: Row[] = sectors.map((s) => {
    const b = buckets.get(s.id)!;
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description ?? "-",
      total: b.total,
      listed: b.listed,
      models: b.models,
      agents: b.agents,
      tools: b.tools,
      skills: b.skills
    };
  });

  const totalCovered = projected.reduce((acc, r) => acc + r.total, 0);
  const totalListed = projected.reduce((acc, r) => acc + r.listed, 0);

  const columns: Column<Row>[] = [
    {
      key: "name",
      label: "Sector",
      render: (row) => (
        <div>
          <div style={{ color: "var(--text)" }}>{row.name}</div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-3)",
              fontFamily: "IBM Plex Mono, monospace"
            }}
          >
            {row.code}
          </div>
        </div>
      )
    },
    { key: "desc", label: "Description", render: (row) => row.description },
    { key: "total", label: "Resources", render: (row) => row.total, mono: true },
    { key: "listed", label: "Listed", render: (row) => row.listed, mono: true },
    { key: "model", label: "Models", render: (row) => row.models, mono: true },
    { key: "agent", label: "Agents", render: (row) => row.agents, mono: true },
    { key: "tool", label: "Tools", render: (row) => row.tools, mono: true },
    { key: "skill", label: "Skills", render: (row) => row.skills, mono: true }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Sectors</h1>
        <p className="p-subtitle">
          {projected.length} sector{projected.length === 1 ? "" : "s"} · {totalCovered} resource
          {totalCovered === 1 ? "" : "s"} mapped · {totalListed} listed in{" "}
          <strong>{cfg.jurisdiction}</strong>.
        </p>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState="No sectors registered. Add rows via /admin/ref/sectors."
        keyOf={(r) => r.id}
      />
    </div>
  );
}
