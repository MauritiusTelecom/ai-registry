import type { ReactNode } from "react";

type PageHeroProps = {
  crumb: ReactNode;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
};

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
