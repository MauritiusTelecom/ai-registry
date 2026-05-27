import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { getConfig } from "@airegistry/sdk";
import { NewResourceForm } from "@/components/portal/NewResourceForm";
import { StubPanel } from "@/components/portals/StubPanel";
import { listReferenceTable } from "@airegistry/sdk/server";

export const metadata = { title: "Provider · Publish" };
export const dynamic = "force-dynamic";

export default async function ProviderPublishPage() {
  const t = await getTranslations("provider.publish");
  const user = await getCurrentUser();
  const cfg = getConfig();
  // Resource types must be active in the DB AND permitted by the env
  // `RESOURCE_TYPES` restriction. The intersection guarantees an admin can
  // hide a type (active=false) without redeploying.
  const allowedTypes = await listReferenceTable("resourceType", { codes: cfg.resourceTypes });

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
      </div>

      {user && !user.canAuthorResources ? (
        <div
          role="status"
          style={{
            marginBottom: 20,
            padding: "14px 18px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "rgba(var(--secondary-rgb), 0.08)",
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: 720
          }}
        >
          {!user.emailVerified ? (
            <>
              <strong>{t("verifyEmail")}</strong> {t("beforePublish")}{" "}
              <Link href="/auth/verify" className="p-footer-link">
                {t("openVerification")}
              </Link>
            </>
          ) : (
            <>
              {t("registrationMsg")}{" "}
              <Link href="/provider/settings" className="p-footer-link" style={{ fontWeight: 600 }}>
                {t("settingsLink")}
              </Link>
            </>
          )}
        </div>
      ) : null}

      {user?.canAuthorResources ? (
        <div className="p-card" style={{ padding: "22px 24px", maxWidth: 640, borderRadius: 12 }}>
          <h2 className="p-card-title" style={{ marginBottom: 8 }}>
            {t("newDraft")}
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 0, marginBottom: 20 }}>
            {t("draftDescription")}
          </p>
          <NewResourceForm
            allowedTypes={allowedTypes}
            afterCreate="provider"
            variant="provider"
          />
        </div>
      ) : (
        <StubPanel area={t("authoringWizardArea")} specHref="ai-registry-specs/modules/provider/publish/product.md" />
      )}
    </div>
  );
}
