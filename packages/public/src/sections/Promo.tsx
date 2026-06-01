import { Link } from "@/i18n/navigation";
import { getPromoBanner } from "@airegistry/core/services/public-cms";
import { getTranslations } from "next-intl/server";
import { Icon } from "@airegistry/ui-kit";
import { Reveal } from "../shell/Reveal";

type PromoData = {
  enabled: boolean;
  heading: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
};

/**
 * Defence-in-depth fallback: shown ONLY if the DB is unreachable.
 * The seed leaves cms_promo_banner.enabled = false on a fresh deploy, so a
 * brand-new install renders the section as hidden (returns null) until an
 * admin enables it via /admin/site/promo.
 */
function getFallbackPromo(t: (key: string) => string): PromoData {
  return {
    enabled: true,
    heading: t("fallbackHeading"),
    body: t("fallbackBody"),
    ctaLabel: t("fallbackCtaLabel"),
    ctaHref: "/contact"
  };
}

export async function Promo() {
  const t = await getTranslations("promo");
  const fallbackPromo = getFallbackPromo(t);
  let promo: PromoData;
  try {
    const row = await getPromoBanner();
    promo = {
      enabled: row.enabled,
      heading: row.heading?.trim() || fallbackPromo.heading,
      body: row.body?.trim() || fallbackPromo.body,
      ctaLabel: row.ctaLabel?.trim() || null,
      ctaHref: row.ctaHref?.trim() || null
    };
  } catch {
    promo = fallbackPromo;
  }

  if (!promo.enabled) return null;

  return (
    <section style={{ padding: "32px 32px 0" }}>
      <Reveal>
        <div className="promo">
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>
              <span className="dot" />
              <span>{t("eyebrow")}</span>
            </div>
            <h2>{promo.heading}</h2>
            <p style={{ fontSize: 16 }}>{promo.body}</p>
          </div>
          {promo.ctaLabel && promo.ctaHref ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href={promo.ctaHref} className="btn btn-primary">
                {promo.ctaLabel} <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}
