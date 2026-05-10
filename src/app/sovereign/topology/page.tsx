import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";

export const metadata = { title: "Sovereign · Topology" };
export const dynamic = "force-dynamic";

const STATUS_COLOUR: Record<string, string> = {
  listed: "var(--text)",
  submitted: "var(--secondary)",
  in_review: "var(--secondary)",
  needs_update: "#f59e0b",
  draft: "var(--text-3)",
  suspended: "#ef4444",
  deprecated: "var(--text-3)",
  removed: "var(--text-3)"
};

export default async function SovereignTopologyPage() {
  const cfg = getConfig();

  // Topology v1: provider → resources tree, scoped to the home jurisdiction.
  // Each provider node summarises its resources by lifecycle so the operator
  // can scan the deployment at a glance. v2 will overlay endpoint dependency
  // arrows once cross-resource references are first-class in schema.
  const providers = await prisma.provider.findMany({
    where: { homeJurisdiction: { code: cfg.jurisdiction } },
    include: {
      type: { select: { name: true, code: true } },
      status: { select: { name: true, code: true } },
      resources: {
        include: {
          resourceType: { select: { code: true } },
          lifecycleStatus: { select: { code: true, name: true } }
        },
        orderBy: { title: "asc" }
      }
    },
    orderBy: { displayName: "asc" }
  });

  const totalResources = providers.reduce((acc, p) => acc + p.resources.length, 0);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Topology</h1>
        <p className="p-subtitle">
          {providers.length} provider{providers.length === 1 ? "" : "s"} · {totalResources}{" "}
          resource{totalResources === 1 ? "" : "s"} anchored in{" "}
          <strong>{cfg.jurisdiction}</strong>. Cross-resource dependency edges land in v2; this
          view groups resources by provider with lifecycle colour coding.
        </p>
      </div>

      {providers.length === 0 ? (
        <p style={{ color: "var(--text-3)" }}>
          No providers anchored in {cfg.jurisdiction} yet.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {providers.map((p) => (
            <section
              key={p.id}
              className="glass"
              style={{ padding: 18, borderRadius: 12 }}
            >
              <header
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "baseline",
                  marginBottom: 10
                }}
              >
                <div>
                  <Link
                    href={`/admin/providers/${p.id}`}
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: "var(--text)",
                      textDecoration: "none"
                    }}
                  >
                    {p.displayName}
                  </Link>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--text-3)",
                      fontFamily: "IBM Plex Mono, monospace",
                      marginTop: 2
                    }}
                  >
                    {p.slug} · {p.type.name} · {p.status.name}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "IBM Plex Mono, monospace",
                    color: "var(--text-3)"
                  }}
                >
                  {p.resources.length} resource{p.resources.length === 1 ? "" : "s"}
                </span>
              </header>

              {p.resources.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
                  No resources yet.
                </p>
              ) : (
                <ul
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: 8,
                    listStyle: "none",
                    padding: 0,
                    margin: 0
                  }}
                >
                  {p.resources.map((r) => (
                    <li
                      key={r.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--input-bg)"
                      }}
                    >
                      <Link
                        href={`/registry/${r.slug}`}
                        style={{
                          color:
                            STATUS_COLOUR[r.lifecycleStatus.code] ?? "var(--text)",
                          textDecoration: "none",
                          fontWeight: 500,
                          fontSize: 13
                        }}
                      >
                        {r.title}
                      </Link>
                      <div
                        style={{
                          marginTop: 4,
                          display: "flex",
                          gap: 8,
                          fontSize: 11,
                          color: "var(--text-3)",
                          fontFamily: "IBM Plex Mono, monospace"
                        }}
                      >
                        <span>{r.resourceType.code}</span>
                        <span>·</span>
                        <span>{r.lifecycleStatus.code}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
