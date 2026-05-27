import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { GatedPublishButton } from "@/components/portals/GatedPublishButton";
import {
  ProviderResourcesGrid,
  type ProviderResourceRow
} from "@/components/portals/provider/ProviderResourcesGrid";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadMyResources } from "@airegistry/sdk/server";

export const metadata = { title: "Provider · Resources" };
export const dynamic = "force-dynamic";

export default async function ProviderResourcesPage() {
  const t = await getTranslations("provider.resources");
  const user = await getCurrentUser();
  if (!user) return null;

  const providerId = user.provider?.id ?? null;

  if (!providerId) {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">{t("noProviderTitle")}</h1>
          <p className="p-subtitle">{t("noProviderSubtitle")}</p>
        </div>
        <div className="p-empty">
          <div className="p-empty-text">{t("noProviderLinkage")}</div>
        </div>
      </div>
    );
  }

  const [projected, kinds, lifecycles] = await Promise.all([
    loadMyResources(providerId),
    listReferenceTable("resourceType"),
    listReferenceTable("lifecycleStatus")
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">
          {t("subtitle", { count: projected.length, provider: user?.provider?.displayName ?? t("thisProvider") })}
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
      <ProviderResourcesGrid rows={projected} kinds={kinds} lifecycles={lifecycles} />
    </div>
  );
}
