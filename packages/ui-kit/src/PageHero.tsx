import type { ReactNode } from "react";

type PageHeroProps = {
  crumb: ReactNode;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
};

/**
 * Section header used at the top of section/index pages across every portal —
 * public site (registry, providers, docs…) and role workspaces (admin reviews,
 * provider resources…). Styling lives in the portal's global stylesheet
 * (`page-hero`, `grid-bg`, `crumbs`); ui-kit only owns the markup.
 */
export function PageHero({ crumb, title, subtitle, children }: PageHeroProps) {
  return (
    <section className="page-hero">
      <div className="grid-bg" style={{ position: "absolute", inset: 0, opacity: 0.6, zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="crumbs">{crumb}</div>
        <h1>{title}</h1>
        {subtitle && (
          <p style={{ marginTop: 18, fontSize: 17, maxWidth: 680, color: "var(--text-2)" }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
