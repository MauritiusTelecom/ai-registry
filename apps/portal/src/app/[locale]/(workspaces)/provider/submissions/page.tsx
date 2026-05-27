import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { GatedPublishButton } from "@/components/portals/GatedPublishButton";
import {
  ProviderSubmissionsGrid,
  type ProviderSubmissionRow
} from "@/components/portals/provider/ProviderSubmissionsGrid";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadMySubmissions } from "@airegistry/sdk/server";

export const metadata = { title: "Provider · Submissions" };
export const dynamic = "force-dynamic";

/**
 * Submissions = my resources whose lifecycle is one of
 * { draft, submitted, in_review, needs_update } - i.e. anything that hasn't
 * yet reached `listed`. This is the provider's view of "what's still in
 * flight".
 */

const PRE_LISTED = ["draft", "submitted", "in_review", "needs_update"] as const;

export default async function ProviderSubmissionsPage() {
  const t = await getTranslations("provider.submissions");
  const user = await getCurrentUser();
  if (!user) return null;

  const providerId = user.provider?.id ?? null;

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

  const allLifecycles = await listReferenceTable("lifecycleStatus");
  const [projected, kinds] = await Promise.all([
    loadMySubmissions(providerId),
    listReferenceTable("resourceType")
  ]);
  // Filter lifecycle filter-dropdown to just the pre-listed codes.
  const lifecycles = allLifecycles.filter((l) =>
    (PRE_LISTED as readonly string[]).includes(l.code)
  );

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">
          {t("subtitle", { count: projected.length })}
        </p>
        <div className="p-actions">
          <GatedPublishButton
            href="/provider/publish"
            canAuthorResources={user.canAuthorResources}
            emailVerified={user.emailVerified}
          >
            {t("publishNewResource")}
          </GatedPublishButton>
        </div>
      </div>
      <ProviderSubmissionsGrid rows={projected} kinds={kinds} lifecycles={lifecycles} />
    </div>
  );
}
