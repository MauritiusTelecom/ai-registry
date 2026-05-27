import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { StatCard } from "@/components/portals/StatCard";
import { loadAdminDashboardStats } from "@airegistry/sdk/server";

export const metadata = { title: "Admin · Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const me = await getCurrentUser();
  const myId = me?.id ?? null;
  const t = await getTranslations("admin.dashboard");
  const tc = await getTranslations("common");

  const [
    resourceCount,
    listedCount,
    providerCount,
    verifiedProviderCount,
    userCount,
    openReviewCount,
    auditCount,
    openComplaintCount,
    myOpenComplaintCount
  ] = await (async () => {
    const s = await loadAdminDashboardStats(myId);
    return [
      s.resourceCount,
      s.listedCount,
      s.providerCount,
      s.verifiedProviderCount,
      s.userCount,
      s.openReviewCount,
      s.auditCount,
      s.openComplaintCount,
      s.myOpenComplaints
    ] as const;
  })();

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
      </div>

      <div className="p-stat-grid">
        <StatCard
          label={t("listedResources")}
          value={listedCount}
          hint={`${tc("of")} ${resourceCount} ${tc("total")}`}
          href="/admin/resources"
        />
        <StatCard
          label={t("verifiedProviders")}
          value={verifiedProviderCount}
          hint={`${tc("of")} ${providerCount} ${tc("total")}`}
          href="/admin/providers"
        />
        <StatCard
          label={t("openReviews")}
          value={openReviewCount}
          hint={openReviewCount > 0 ? tc("needsAttention") : tc("allCaughtUp")}
          intent={openReviewCount > 0 ? "warning" : "positive"}
          href="/admin/reviews"
        />
        <StatCard
          label={t("openComplaints")}
          value={openComplaintCount}
          intent={openComplaintCount > 0 ? "warning" : "positive"}
          href="/admin/complaints"
        />
        <StatCard label={t("users")} value={userCount} href="/admin/users" />
        <StatCard
          label={t("auditEntries")}
          value={auditCount.toLocaleString()}
          href="/admin/audit"
        />
      </div>

      {me ? (
        <div style={{ marginTop: 24 }}>
          <MyOpenComplaintsCard count={myOpenComplaintCount} name={me.name} />
        </div>
      ) : null}

      <h2 style={{ marginTop: 24, marginBottom: 12, fontSize: 18 }}>{t("queues")}</h2>
      <div className="p-stat-grid">
        <QueueCard
          title={t("sovereigntyReviewQueue")}
          href="/admin/reviews"
          body={t("sovereigntyReviewQueueBody")}
        />
        <QueueCard
          title={t("auditLog")}
          href="/admin/audit"
          body={t("auditLogBody")}
        />
        <QueueCard
          title={t("resources")}
          href="/admin/resources"
          body={t("resourcesBody")}
        />
        <QueueCard
          title={t("providers")}
          href="/admin/providers"
          body={t("providersBody")}
        />
      </div>
    </div>
  );
}

/**
 * Personal "what's on your plate" card on the admin dashboard. Renders the
 * count of open / investigating complaints assigned to the signed-in admin
 * and links straight to the "Assigned to me" filter on the Complaints page.
 *
 * When the count is zero the card shifts to a positive "all clear" tone so
 * the admin doesn't see warning colours for empty work.
 */
async function MyOpenComplaintsCard({ count, name }: { count: number; name: string }) {
  const t = await getTranslations("admin.dashboard");
  const hasWork = count > 0;
  return (
    <Link
      href="/admin/complaints?status=mine"
      className="feature-card p-stat-card-link"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 18,
        textDecoration: "none",
        background: hasWork
          ? "linear-gradient(96deg, rgba(245, 158, 11, 0.10), rgba(245, 158, 11, 0.04))"
          : "var(--panel)",
        border: hasWork ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid var(--border)",
        borderRadius: 12,
        padding: "18px 22px",
        color: "inherit"
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 10.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            marginBottom: 6
          }}
        >
          {t("yourQueue")}
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>
          {hasWork
            ? t("openComplaintsAssigned", { count })
            : t("noComplaintsAssigned")}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          {hasWork
            ? t("complaintsWaiting", { name })
            : t("allCaughtUp", { name })}
        </div>
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 600,
          fontFamily: "IBM Plex Mono, monospace",
          color: hasWork ? "#f59e0b" : "var(--text-3)",
          minWidth: 50,
          textAlign: "right"
        }}
      >
        {count}
      </div>
    </Link>
  );
}

async function QueueCard({ title, href, body }: { title: string; href: string; body: string }) {
  const tc = await getTranslations("common");
  return (
    <Link
      href={href}
      className="feature-card p-stat-card-link"
      style={{
        display: "block",
        textDecoration: "none",
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 22px",
        color: "inherit"
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5 }}>{body}</div>
      <div
        style={{
          marginTop: 12,
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--text-3)"
        }}
      >
        {tc("open")}
      </div>
    </Link>
  );
}
