import type { ReactNode } from "react";

/**
 * Wrapper used by the auth pages (login / register / reset). Provides the
 * narrow centred layout, eyebrow + heading, and a `glass` panel for the form.
 * Reuses public-portal classes (.section, .glass, etc.) so visual parity is
 * automatic.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="section" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="section-header" style={{ marginBottom: 28 }}>
          <div className="eyebrow">
            <span className="dot" />
            <span>{eyebrow}</span>
          </div>
          <h2 style={{ marginTop: 8 }}>{title}</h2>
          {subtitle ? (
            <p style={{ color: "var(--text-2)", fontSize: 14 }}>{subtitle}</p>
          ) : null}
        </div>
        <div className="glass" style={{ padding: 32 }}>
          {children}
        </div>
        {footer ? (
          <div
            style={{
              marginTop: 18,
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 12.5,
              color: "var(--text-3)",
              textAlign: "center"
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </section>
  );
}
