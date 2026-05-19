import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Provider · Analytics" };
export const dynamic = "force-dynamic";

/**
 * Provider · Analytics - surface counts that are actually persisted today
 * (catalogue mix, lifecycle bucketing, recent decisions, recent complaints).
 * Discovery-call telemetry, latency, and regional spread require an
 * out-of-process analytics sink; those land once `T201 - structured logging`
 * forwards request log lines to a hosted store.
 *
 * Module spec: `modules/provider/analytics/product.md`.
 */
export default async function ProviderAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const providerId = await ensureUserProviderLinked(user.id);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [resources, decisionsRecent, complaintsRecent, listingByKind] = await Promise.all([
    prisma.resource.findMany({
      where: { providerId },
      include: {
        resourceType: { select: { code: true } },
        lifecycleStatus: { select: { code: true } }
      }
    }),
    prisma.review.count({
      where: {
        resource: { providerId },
        completedAt: { gte: since30d },
        status: { code: "decided" }
      }
    }),
    prisma.complaint.count({
      where: {
        OR: [{ targetProviderId: providerId }, { targetResource: { providerId } }],
        createdAt: { gte: since30d }
      }
    }),
    prisma.resource.groupBy({
      by: ["resourceTypeId"],
      where: { providerId, lifecycleStatus: { code: "listed" } },
      _count: { _all: true }
    })
  ]);

  const lifecycle = resources.reduce<Record<string, number>>((acc, r) => {
    acc[r.lifecycleStatus.code] = (acc[r.lifecycleStatus.code] ?? 0) + 1;
    return acc;
  }, {});

  const types = await prisma.resourceType.findMany({ select: { id: true, code: true, name: true } });
  const codeById = new Map(types.map((t) => [t.id, { code: t.code, name: t.name }]));

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Analytics</h1>
        <p className="p-subtitle">
          Catalogue and governance signals over the last 30 days. Discovery-call telemetry lands
          once the structured-logging sink is provisioned (post-Phase 5).
        </p>
      </div>

      <div className="p-stat-grid">
        <Stat label="Resources" value={resources.length} hint="all lifecycles" />
        <Stat
          label="Listed"
          value={lifecycle.listed ?? 0}
          hint={`${Math.round(((lifecycle.listed ?? 0) / Math.max(1, resources.length)) * 100)}% of catalogue`}
        />
        <Stat
          label="In flight"
          value={
            (lifecycle.draft ?? 0) +
            (lifecycle.submitted ?? 0) +
            (lifecycle.in_review ?? 0) +
            (lifecycle.needs_update ?? 0)
          }
          hint="draft / submitted / in_review / needs_update"
        />
        <Stat
          label="Decisions (30d)"
          value={decisionsRecent}
          hint="reviews completed against this provider"
        />
        <Stat
          label="Complaints (30d)"
          value={complaintsRecent}
          hint="public reports targeting you"
          warning={complaintsRecent > 0}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18,
          marginTop: 8
        }}
      >
        <Card title="Listed by kind">
          {listingByKind.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
              No listed resources yet.
            </p>
          ) : (
            <ul style={{ display: "grid", gap: 8, fontSize: 13, margin: 0, padding: 0, listStyle: "none" }}>
              {listingByKind.map((g) => {
                const t = codeById.get(g.resourceTypeId);
                return (
                  <li
                    key={g.resourceTypeId}
                    style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}
                  >
                    <span style={{ color: "var(--text)" }}>{t?.name ?? "-"}</span>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", color: "var(--text-2)" }}>
                      {g._count._all}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Lifecycle bucketing">
          {Object.keys(lifecycle).length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
              No resources yet.
            </p>
          ) : (
            <ul style={{ display: "grid", gap: 8, fontSize: 13, margin: 0, padding: 0, listStyle: "none" }}>
              {Object.entries(lifecycle).map(([code, n]) => (
                <li
                  key={code}
                  style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}
                >
                  <span style={{ color: "var(--text)", fontFamily: "IBM Plex Mono, monospace" }}>
                    {code}
                  </span>
                  <span style={{ fontFamily: "IBM Plex Mono, monospace", color: "var(--text-2)" }}>
                    {n}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div style={{ marginTop: 12 }}>
            <Link href="/provider/submissions" className="p-footer-link">
              Submissions →
            </Link>
            {" · "}
            <Link href="/provider/resources" className="p-footer-link">
              Catalogue →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  warning = false
}: {
  label: string;
  value: number;
  hint: string;
  warning?: boolean;
}) {
  return (
    <div className="p-stat-card">
      <div className="p-stat-label">{label}</div>
      <div className="p-stat-value">{value}</div>
      <div className={`p-stat-hint${warning ? " warning" : ""}`}>{hint}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass" style={{ padding: 20, borderRadius: 12 }}>
      <h2
        style={{
          fontSize: 12,
          fontFamily: "IBM Plex Mono, monospace",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          marginBottom: 12
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
