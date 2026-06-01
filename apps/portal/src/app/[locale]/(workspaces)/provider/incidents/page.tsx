import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";
import {
  ProviderIncidentsGrid,
  type ProviderIncidentRow
} from "@/components/portals/provider/ProviderIncidentsGrid";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadMyIncidents } from "@airegistry/sdk/server";


export async function generateMetadata() {
  return workspaceMetadata("provider.incidents");
}

export const dynamic = "force-dynamic";

/**
 * Operator-driven enforcement actions targeting this provider's resources
 * or the provider record itself. Scoping invariant:
 *
 *   targetProviderId === user.provider.id
 *   OR targetResource.providerId === user.provider.id
 *
 * Public-safe projection: `internalNote` is NEVER surfaced here. Provider
 * sees the publicNote (operator-curated explanation) and the action type.
 */

export default async function ProviderIncidentsPage() {
  const t = await getTranslations("provider.incidents");
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

  const [rows, actionTypes] = await Promise.all([
    loadMyIncidents(providerId),
    listReferenceTable("enforcementType")
  ]);

  const projected: ProviderIncidentRow[] = rows;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">
          {t("subtitle", { provider: user?.provider?.displayName ?? "", count: projected.length })}
        </p>
      </div>
      <ProviderIncidentsGrid rows={projected} actionTypes={actionTypes} />
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
