import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { getConfig } from "@airegistry/sdk";
import { ProviderOrganisationForm } from "@/components/portals/ProviderOrganisationForm";
import { ProviderDocumentsCard } from "@/components/portal/ProviderDocumentsCard";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadProviderForSettings } from "@airegistry/sdk/server";
// import { ProviderNotificationsForm } from "@/components/portals/ProviderNotificationsForm";

export const metadata = { title: "Provider · Settings" };
export const dynamic = "force-dynamic";

export default async function ProviderSettingsPage() {
  const t = await getTranslations("provider.settings");
  const user = await getCurrentUser();
  if (!user) return null;

  // /provider/settings is the self-serve surface for a provider user to edit
  // their own organisation. Admins land here via the role-aliased gate
  // (admin can act in any portal), but they aren't linked to a Provider row,
  // so route them to /admin/providers instead of crashing inside
  // ensureUserProviderLinked.
  if (user.role.code !== "provider") {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">{t("title")}</h1>
          <p className="p-subtitle">{t("subtitle")}</p>
        </div>
        <div
          className="glass"
          style={{
            padding: 24,
            maxWidth: 720,
            fontSize: 14,
            lineHeight: 1.6
          }}
        >
          {t("notProviderMessage", { role: user.role.code })}
          <div style={{ marginTop: 16 }}>
            <Link href="/admin/providers" className="btn btn-primary">
              {t("openAdminProviders")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const providerId = await ensureUserProviderLinked(user.id);
  const cfg = getConfig();

  const [provider, providerTypes, jurisdictions, documentTypes] = await Promise.all([
    loadProviderForSettings(providerId),
    listReferenceTable("providerTypeRef", { orderBy: "name" }),
    listReferenceTable("jurisdiction", { orderBy: "name" }),
    listReferenceTable("providerDocumentType", { orderBy: "sortOrder" })
  ]);

  if (!provider) {
    return (
      <div className="p-content">
        <p>{t("providerMissing")}</p>
      </div>
    );
  }

  const initial = {
    displayName: provider.displayName,
    slug: provider.slug,
    contactEmail: provider.contactEmail,
    providerTypeCode: provider.type.code,
    jurisdictionCode: provider.homeJurisdiction.code,
    legalName: provider.legalName ?? "",
    description: provider.description ?? ""
  };

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
      </div>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr", marginTop: 8 }}>
        <ProviderOrganisationForm
          initial={initial}
          providerTypes={providerTypes}
          jurisdictions={jurisdictions}
          defaultJurisdictionCode={cfg.jurisdiction}
        />

        <ProviderDocumentsCard
          documentTypes={documentTypes.map((t) => ({ code: t.code, name: t.name }))}
        />

        {/*
          Notifications section temporarily hidden — incident channel,
          on-call email, and webhook URL are not yet wired into the
          registry's paging flows. Re-enable once those backend integrations
          land.

          <div style={{ maxWidth: 560 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Notifications</h2>
            <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 0, marginBottom: 14 }}>
              Where the registry pages your team during incidents and renewals. All three fields are
              optional.
            </p>
            <ProviderNotificationsForm
              initial={{
                incidentChannel: provider.incidentChannel,
                oncallEmail: provider.oncallEmail,
                webhookUrl: provider.webhookUrl
              }}
            />
          </div>
        */}
      </div>
    </div>
  );
}
