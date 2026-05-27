import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import {
  ProviderReviewsGrid,
  type ProviderReviewRow
} from "@/components/portals/provider/ProviderReviewsGrid";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadMyReviews } from "@airegistry/sdk/server";

export const metadata = { title: "Provider · Reviews" };
export const dynamic = "force-dynamic";

/**
 * Reviews of this provider's resources or the provider record itself.
 * Scoping invariant:
 *
 *   providerId === user.provider.id
 *   OR resource.providerId === user.provider.id
 *
 * Public-safe projection: `internalNotes` and reviewer email are NEVER
 * surfaced here. Decision summaries are always shown; conditions only when
 * the review is decided.
 */

const STATUS_DISPLAY: Record<string, string> = {
  open: "experimental",
  in_review: "experimental",
  decided: "verified",
  withdrawn: "isolated"
};

export default async function ProviderReviewsPage() {
  const t = await getTranslations("provider.reviews");
  const user = await getCurrentUser();
  const providerId = user?.provider?.id ?? null;

  if (!providerId) {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">{t("title")}</h1>
          <p className="p-subtitle">{t("noProviderSubtitle")}</p>
        </div>
        <div className="p-empty">
          <div className="p-empty-text">{t("noProviderLinkage")}</div>
        </div>
      </div>
    );
  }

  const [rawReviews, types] = await Promise.all([
    loadMyReviews(providerId),
    listReferenceTable("reviewType")
  ]);

  const projected: ProviderReviewRow[] = rawReviews.map((r) => ({
    id: r.id,
    target: r.target,
    targetSlug: r.targetSlug,
    type: r.type,
    status: STATUS_DISPLAY[r.statusCode] ?? "active",
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    decisionSummary: r.decisionSummary
  }));

  const openCount = projected.filter((r) => r.status === "experimental").length;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">
          {t("subtitle", { count: projected.length, provider: user?.provider?.displayName ?? "", openCount })}
        </p>
      </div>
      <ProviderReviewsGrid rows={projected} types={types} />
      <p
        style={{
          marginTop: 18,
          fontSize: 12,
          color: "var(--text-3)",
          fontFamily: "IBM Plex Mono, monospace"
        }}
      >
        {t("internalNote")}
      </p>
    </div>
  );
}
