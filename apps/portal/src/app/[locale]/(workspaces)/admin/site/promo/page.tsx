import { getTranslations } from "next-intl/server";
import { getPromoBanner } from "@airegistry/core/services/public-cms";
import { PromoBannerForm } from "@/components/admin/site/PromoBannerForm";

export const metadata = { title: "Admin · Site · Promo banner" };
export const dynamic = "force-dynamic";

export default async function AdminPromoPage() {
  const t = await getTranslations("admin.sitePromo");
  const row = await getPromoBanner();
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
      </div>

      <PromoBannerForm
        initial={{
          enabled: row.enabled,
          heading: row.heading ?? "",
          body: row.body ?? "",
          ctaLabel: row.ctaLabel ?? "",
          ctaHref: row.ctaHref ?? ""
        }}
      />
    </div>
  );
}
