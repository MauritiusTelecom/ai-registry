import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { loadVerifierDashboardStats } from "@airegistry/sdk/server";
import { StatCard } from "@/components/portals/StatCard";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("verifier.dashboard");
}

export const dynamic = "force-dynamic";

export default async function VerifierDashboardPage() {
  const t = await getTranslations("verifier.dashboard");
  const { openReviews, decidedLast30Days: decided30d } = await loadVerifierDashboardStats();
  // Phase 4 will populate these; keep zeros until then.
  const redteamFindings = 0;
  const signedReports = 0;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
      </div>

      <div className="p-stat-grid">
        <StatCard
          label={t("statOpenReviews")}
          value={openReviews}
          intent={openReviews > 0 ? "warning" : "positive"}
          hint={openReviews > 0 ? t("hintNeedsAttention") : t("hintQueueClear")}
        />
        <StatCard label={t("statDecided30d")} value={decided30d} />
        <StatCard label={t("statRedteamFindings")} value={redteamFindings} hint={t("hintPhase4")} />
        <StatCard label={t("statSignedReports")} value={signedReports} hint={t("hintPhase4")} />
      </div>

      <h2 style={{ marginTop: 24, marginBottom: 12, fontSize: 18 }}>{t("workspacesHeading")}</h2>
      <div className="p-stat-grid">
        <Link
          href="/verifier/queue"
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
            {t("reviewQueueLink")}
          </div>
          <div style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5 }}>
            {t("reviewQueueDescription")}
          </div>
        </Link>
      </div>
    </div>
  );
}
