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

/**
 * Form field used inside auth forms. Renders a mono-uppercase label above
 * a child control (typically an `<input className="auth-input">`).
 *
 * Shared here rather than redefined per form. Distinct from the library's
 * `<Field>` because the auth label aesthetic — IBM Plex Mono, 10.5px,
 * 0.18em letter-spacing, uppercase, --text-3 colour — is deliberately
 * smaller and more decorative than the standard form label, and it pairs
 * with the bespoke `.auth-input` styling rather than `.p-input`.
 */
export function AuthFormField({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--text-3)"
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
// extra padding
