import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Icon } from "@airegistry/ui-kit";
import { prisma } from "@airegistry/core/prisma";

export const metadata = { title: "Admin · Site content" };
export const dynamic = "force-dynamic";

/**
 * Site-content landing. Shows a card per editable CMS section with the
 * current row count or singleton status. Each card links into the
 * per-section CRUD page.
 *
 * Data here is summary only — counts and a "last updated" tick. Detail
 * fetches happen inside the per-section pages so this dashboard renders
 * fast even when the underlying tables grow.
 */
export default async function AdminSitePage() {
  const t = await getTranslations("admin.site");
  const [faqCount, hiwCount, criteriaCount, promo] = await Promise.all([
    prisma.cmsFaqEntry.count(),
    prisma.cmsHowItWorksStep.count(),
    prisma.cmsListingCriterion.count(),
    prisma.cmsPromoBanner.findUnique({ where: { id: "default" } })
  ]);

  const cards: Array<{
    href: string;
    title: string;
    summary: string;
    icon: "doc" | "flow" | "check" | "zap";
  }> = [
    {
      href: "/admin/site/faq",
      title: t("faqCard"),
      summary: t("faqCount", { count: faqCount }),
      icon: "doc"
    },
    {
      href: "/admin/site/how-it-works",
      title: t("hiwCard"),
      summary: t("hiwCount", { count: hiwCount }),
      icon: "flow"
    },
    {
      href: "/admin/site/listing-criteria",
      title: t("criteriaCard"),
      summary: t("criteriaCount", { count: criteriaCount }),
      icon: "check"
    },
    {
      href: "/admin/site/promo",
      title: t("promoCard"),
      summary: promo?.enabled ? t("promoEnabled") : t("promoHidden"),
      icon: "zap"
    }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16
        }}
      >
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            style={{
              display: "block",
              padding: 22,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              textDecoration: "none",
              color: "var(--text)",
              transition: "border-color 180ms"
            }}
            className="feature-card"
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                marginBottom: 12,
                background: "rgba(var(--primary-rgb), 0.12)",
                color: "var(--primary)",
                border: "1px solid rgba(var(--primary-rgb), 0.30)"
              }}
            >
              <Icon name={c.icon} size={18} stroke={1.8} />
            </div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 500 }}>
              {c.title}
            </h3>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13.5 }}>
              {c.summary}
            </p>
          </Link>
        ))}
      </div>

      <p
        style={{
          marginTop: 32,
          color: "var(--text-3)",
          fontSize: 13,
          maxWidth: 700
        }}
      >
        {t.rich("fallbackNote", {
          code: (chunks) => <code>{chunks}</code>
        })}
      </p>
    </div>
  );
}
