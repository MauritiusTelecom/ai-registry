import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, loadProviderDashboardStats } from "@airegistry/sdk/server";
import { StatCard } from "@/components/portals/StatCard";
import { GatedPublishButton } from "@/components/portals/GatedPublishButton";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("provider.dashboard");
}

export const dynamic = "force-dynamic";

export default async function ProviderDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const providerId = user?.provider?.id ?? null;
  const t = await getTranslations("provider.dashboard");
  const tc = await getTranslations("common");

  const {
    totalResources: resources,
    listedResources: listed,
    openSubmissions: openSubs,
    openComplaints,
    openReviews,
    enforcementActions
  } = await loadProviderDashboardStats(providerId);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">
          {t("title", { name: user?.provider?.displayName ?? user?.name })}
        </h1>
        <p className="p-subtitle">
          {providerId ? t("subtitleLinked") : t("subtitleUnlinked")}
        </p>
        {providerId ? (
          <div className="p-actions" style={{ marginTop: 12 }}>
            <GatedPublishButton
              href="/provider/publish"
              canAuthorResources={user.canAuthorResources}
              emailVerified={user.emailVerified}
            >
              {t("publishResource")}
            </GatedPublishButton>
          </div>
        ) : null}
      </div>

      <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-3)", fontFamily: "IBM Plex Mono, monospace" }}>
        {t("catalogue")}
      </h2>
      <div className="p-stat-grid">
        <StatCard
          label={t("listedResources")}
          value={listed}
          hint={`${tc("of")} ${resources} ${tc("total")}`}
          href="/provider/resources"
        />
        <StatCard
          label={t("submissionsInFlight")}
          value={openSubs}
          intent={openSubs > 0 ? "warning" : "positive"}
          hint={openSubs > 0 ? t("draftsInReview") : t("allListed")}
          href="/provider/submissions"
        />
      </div>

      <h2 style={{ marginTop: 24, marginBottom: 12, fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-3)", fontFamily: "IBM Plex Mono, monospace" }}>
        {t("inbox")}
      </h2>
      <div className="p-stat-grid">
        <StatCard
          label={t("openComplaints")}
          value={openComplaints}
          intent={openComplaints > 0 ? "warning" : "positive"}
          href="/provider/complaints"
        />
        <StatCard
          label={t("openReviews")}
          value={openReviews}
          intent={openReviews > 0 ? "warning" : "positive"}
          hint={openReviews > 0 ? t("awaitingDecision") : t("noneInFlight")}
          href="/provider/reviews"
        />
        <StatCard
          label={t("enforcementActions")}
          value={enforcementActions}
          intent={enforcementActions > 0 ? "warning" : "positive"}
          href="/provider/incidents"
        />
      </div>

      <h2 style={{ marginTop: 28, marginBottom: 12, fontSize: 18 }}>{t("whatYouCanDo")}</h2>
      <div className="p-stat-grid">
        <ActionCard title={t("myResources")} href="/provider/resources" body={t("myResourcesDesc")} />
        <ActionCard title={t("submissions")} href="/provider/submissions" body={t("submissionsDesc")} />
        <ActionCard title={t("complaints")} href="/provider/complaints" body={t("complaintsDesc")} />
        <ActionCard title={t("reviews")} href="/provider/reviews" body={t("reviewsDesc")} />
        <ActionCard title={t("incidents")} href="/provider/incidents" body={t("incidentsDesc")} />
      </div>
    </div>
  );
}

function ActionCard({ title, href, body }: { title: string; href: string; body: string }) {
  // `feature-card` paints the same primary→tertiary gradient-ring glow used
  // on the public-home cards (.pillar / .r-card) and on the dashboard's
  // StatCard tiles. `p-stat-card-link` adds the matching hover lift and
  // focus ring so all the clickable cards on this page share one effect.
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
    </Link>
  );
}
