import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { ResourcesAdmin } from "@/components/admin/ResourcesAdmin";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadActiveProvidersForFilter } from "@airegistry/sdk/server";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("admin.resources");
}

export const dynamic = "force-dynamic";

export default async function AdminResourcesPage() {
  const actor = await getCurrentUser();
  if (!actor || !actor.roles.includes("admin")) notFound();
  const t = await getTranslations("admin.resources");

  const [kinds, lifecycles, providers, jurisdictions, riskLevels] = await Promise.all([
    listReferenceTable("resourceType"),
    listReferenceTable("lifecycleStatus"),
    loadActiveProvidersForFilter(),
    listReferenceTable("jurisdiction", { orderBy: "name" }),
    listReferenceTable("riskLevel")
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
      </div>
      <ResourcesAdmin
        kinds={kinds}
        lifecycles={lifecycles}
        providers={providers}
        jurisdictions={jurisdictions}
        riskLevels={riskLevels}
      />
    </div>
  );
}
