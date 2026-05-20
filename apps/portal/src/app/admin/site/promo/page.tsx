import { getPromoBanner } from "@airegistry/core/services/public-cms";
import { PromoBannerForm } from "@/components/admin/site/PromoBannerForm";

export const metadata = { title: "Admin · Site · Promo banner" };
export const dynamic = "force-dynamic";

export default async function AdminPromoPage() {
  const row = await getPromoBanner();
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Promo banner</h1>
        <p className="p-subtitle">
          Singleton in <code>cms_promo_banner</code>. Shown on the public home
          page between &ldquo;How it works&rdquo; and the FAQ section.
        </p>
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
