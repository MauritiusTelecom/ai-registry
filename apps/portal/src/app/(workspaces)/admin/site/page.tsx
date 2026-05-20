import Link from "next/link";
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
      title: "FAQ",
      summary: `${faqCount} ${faqCount === 1 ? "entry" : "entries"}`,
      icon: "doc"
    },
    {
      href: "/admin/site/how-it-works",
      title: "How it works",
      summary: `${hiwCount} ${hiwCount === 1 ? "step" : "steps"}`,
      icon: "flow"
    },
    {
      href: "/admin/site/listing-criteria",
      title: "Listing criteria",
      summary: `${criteriaCount} ${criteriaCount === 1 ? "criterion" : "criteria"}`,
      icon: "check"
    },
    {
      href: "/admin/site/promo",
      title: "Promo banner",
      summary: promo?.enabled ? "Enabled" : "Hidden",
      icon: "zap"
    }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Site content</h1>
        <p className="p-subtitle">
          Public-portal copy that an operator can edit without code. Changes
          take effect on the next request to the public site (server-rendered;
          no cache invalidation needed). Edits are audited under
          <Link href="/admin/audit" style={{ marginLeft: 6 }}>
            /admin/audit
          </Link>
          .
        </p>
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
        Each section falls back to a hardcoded default if the corresponding
        table is empty, so a fresh deploy renders correctly out of the box
        before any rows exist. Run <code>pnpm db:seed</code> once on bootstrap
        to populate the tables with the legacy hardcoded strings; subsequent
        seeds will not overwrite admin edits.
      </p>
    </div>
  );
}
