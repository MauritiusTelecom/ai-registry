import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadProviderAnalytics } from "@airegistry/sdk/server";

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
  const i18n = await getTranslations("provider.analytics");
  const user = await getCurrentUser();
  if (!user) return null;

  const providerId = await ensureUserProviderLinked(user.id);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const { resourceCount, lifecycle, listingByTypeId, decisionsRecent, complaintsRecent } =
    await loadProviderAnalytics(providerId);
  // Shape parity with the original Prisma groupBy result: each entry is
  // { resourceTypeId, _count: { _all } }. Keep `listingByKind` as the
  // downstream variable name.
  const listingByKind = listingByTypeId.map((e) => ({
    resourceTypeId: e.resourceTypeId,
    _count: { _all: e.count }
  }));

  const types = await listReferenceTable("resourceType", { activeOnly: false });
  const codeById = new Map(types.map((t) => [t.id, { code: t.code, name: t.name }]));

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{i18n("title")}</h1>
        <p className="p-subtitle">{i18n("subtitle")}</p>
      </div>

      <div className="p-stat-grid">
        <Stat label={i18n("statResources")} value={resourceCount} hint={i18n("statAllLifecycles")} />
        <Stat
          label={i18n("statListed")}
          value={lifecycle.listed ?? 0}
          hint={i18n("statPercentCatalogue", { percent: Math.round(((lifecycle.listed ?? 0) / Math.max(1, resourceCount)) * 100) })}
        />
        <Stat
          label={i18n("statInFlight")}
          value={
            (lifecycle.draft ?? 0) +
            (lifecycle.submitted ?? 0) +
            (lifecycle.in_review ?? 0) +
            (lifecycle.needs_update ?? 0)
          }
          hint={i18n("statInFlightHint")}
        />
        <Stat
          label={i18n("statDecisions30d")}
          value={decisionsRecent}
          hint={i18n("statDecisionsHint")}
        />
        <Stat
          label={i18n("statComplaints30d")}
          value={complaintsRecent}
          hint={i18n("statComplaintsHint")}
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
        <Card title={i18n("cardListedByKind")}>
          {listingByKind.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
              {i18n("noListedResources")}
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

        <Card title={i18n("cardLifecycleBucketing")}>
          {Object.keys(lifecycle).length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
              {i18n("noResourcesYet")}
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
              {i18n("submissionsLink")}
            </Link>
            {" · "}
            <Link href="/provider/resources" className="p-footer-link">
              {i18n("catalogueLink")}
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
