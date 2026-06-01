import { getTranslations } from "next-intl/server";
import { listAllListingCriteria } from "@airegistry/core/services/public-cms";
import { ListingCriterionForm } from "@/components/admin/site/ListingCriterionForm";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("admin.siteListingCriteriaNew");
}

export const dynamic = "force-dynamic";

export default async function AdminListingCriteriaNewPage() {
  const t = await getTranslations("admin.siteListingCriteria");
  const rows = await listAllListingCriteria();
  const nextSortOrder = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.sortOrder)) + 1;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("newTitle")}</h1>
        <p className="p-subtitle">{t("newSubtitle")}</p>
      </div>
      <ListingCriterionForm
        mode="create"
        initial={{
          code: "",
          title: "",
          description: "",
          iconName: "check",
          sortOrder: nextSortOrder,
          active: true
        }}
      />
    </div>
  );
}
