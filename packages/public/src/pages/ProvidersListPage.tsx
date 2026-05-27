import { getTranslations } from "next-intl/server";
import { getBranding } from "@airegistry/core/branding";
import { PageHero } from "@airegistry/ui-kit";
import { ProvidersSection } from "../sections/ProvidersSection";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Providers");
}

export default async function ProvidersPage() {
  const [{ jurisdictionDisplayName }, t] = await Promise.all([
    getBranding(),
    getTranslations("providersSection")
  ]);
  return (
    <div>
      <PageHero
        crumb={t("crumb")}
        title={
          <>
            {t.rich("heading", {
              jurisdiction: jurisdictionDisplayName,
              accent: (chunks) => <span className="gradient-text">{chunks}</span>
            })}
          </>
        }
        subtitle={t("subtitle")}
      />
      <ProvidersSection withHeader={false} />
    </div>
  );
}
