import type { ReactNode } from "react";
import { PageHero } from "./PageHero";

type DocPageProps = {
  crumb: ReactNode;
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
};

// Plain content page used for footer-linked surfaces (whitepaper, sovereignty
// rubric, verification, pricing, legal pages, etc.). Mirrors the layout of
// /registry/[slug] so the public portal feels consistent.
export function DocPage({ crumb, title, subtitle, children }: DocPageProps) {
  return (
    <div>
      <PageHero crumb={crumb} title={title} subtitle={subtitle} />
      <section className="section" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 24 }}>
          {children}
        </div>
      </section>
    </div>
  );
}

type PanelProps = { title?: string; children: ReactNode };

export function DocPanel({ title, children }: PanelProps) {
  return (
    <div>
      {title ? <h3 style={{ marginBottom: 12 }}>{title}</h3> : null}
      <div className="glass" style={{ padding: 28, fontSize: 15, lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}
