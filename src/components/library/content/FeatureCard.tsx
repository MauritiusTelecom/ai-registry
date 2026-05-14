import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { IconTile, type Tone } from "../chrome/IconTile";
import { EyebrowLabel } from "../chrome/EyebrowLabel";
import { MetaPill } from "../chrome/MetaPill";
import { Icon, type IconName } from "../chrome/Icon";

/**
 * The workhorse public-site card. Composes the recurring pattern
 *
 *   feature-card
 *   ├─ IconTile (optional)
 *   ├─ EyebrowLabel (optional)
 *   ├─ Title (h4)
 *   ├─ Body paragraph
 *   ├─ MetaPill (optional)
 *   └─ Footer / CTA arrow (optional)
 *
 * Variations the card handles directly:
 *   - `featured` swaps in a gradient border and gradient title text
 *   - `href` makes the entire card a link (next/link for internal, <a> for external)
 *   - `tone` sets the IconTile colour family
 *   - `bullets` renders a `<ul>` body instead of a `<p>` (used by the
 *     audiences cards in /ecosystem)
 *   - `children` overrides the body slot entirely for bespoke content
 *
 * Falls back to a plain `<div>` when no href is given.
 *
 * Example:
 *   <FeatureCard
 *     tone="primary"
 *     icon="flow"
 *     title="Implementation & onboarding"
 *     body="Help providers prepare submissions…"
 *   />
 */

export type FeatureCardProps = {
  /** Section number / track label rendered above the title as a mono pill. */
  eyebrow?: ReactNode;
  /** Icon name (renders an IconTile when given). */
  icon?: IconName;
  /** Tone for the icon tile + featured accents. */
  tone?: Tone;
  /** Heading text. */
  title?: ReactNode;
  /** Body paragraph. Mutually exclusive with `bullets` / `children`. */
  body?: ReactNode;
  /** Bulleted list rendered in place of a body paragraph. */
  bullets?: ReactNode[];
  /** Subtitle rendered below the title in mono. */
  subtitle?: ReactNode;
  /** Mono metadata pill rendered below the body. */
  meta?: ReactNode;
  /** Slot for arbitrary trailing content (e.g. a CTA row). */
  footer?: ReactNode;
  /** Free CTA label - renders an arrow-suffixed "Action →" line at the bottom. */
  ctaLabel?: ReactNode;
  /** When set, the whole card becomes a link to this href. */
  href?: string;
  /** Override link semantics. Auto-detected from `href` (http* → external). */
  external?: boolean;
  /** Apply the gradient-border + gradient-title featured treatment. */
  featured?: boolean;
  /** Padding override. Defaults to 22 (matches the marketing sections). */
  padding?: number;
  /** Use `--border-strong` instead of `--border`. */
  borderStrong?: boolean;
  /** Override panel background (radial gradients etc). */
  background?: string;
  /** Override the card layout entirely. Use when none of the slots fit. */
  children?: ReactNode;
  /** Forwarded for one-off tweaks (margin, max-width). */
  style?: CSSProperties;
};

export function FeatureCard({
  eyebrow,
  icon,
  tone = "primary",
  title,
  body,
  bullets,
  subtitle,
  meta,
  footer,
  ctaLabel,
  href,
  external,
  featured,
  padding = 22,
  borderStrong,
  background,
  children,
  style
}: FeatureCardProps) {
  const isExternal = external ?? Boolean(href && /^https?:/i.test(href));

  const cardStyle: CSSProperties = {
    position: "relative",
    padding,
    borderRadius: 14,
    border: `1px solid ${
      featured
        ? "rgba(var(--primary-rgb), 0.40)"
        : borderStrong
          ? "var(--border-strong)"
          : "var(--border)"
    }`,
    background:
      background ??
      (featured
        ? "linear-gradient(160deg, rgba(var(--primary-rgb), 0.10), var(--panel))"
        : "var(--panel)"),
    color: "inherit",
    textDecoration: "none",
    display: "block",
    transition: "transform 220ms cubic-bezier(.2,.8,.2,1), border-color 220ms",
    ...style
  };

  // The card body is rendered into whichever wrapper element the call site needs:
  // a Next Link for internal hrefs, an <a> for external, otherwise a <div>.
  const inner = (
    <>
      {icon ? <IconTile name={icon} tone={tone} /> : null}
      {eyebrow ? (
        <EyebrowLabel
          tone={featured ? "accent" : "muted"}
          marginBottom={icon ? 8 : 10}
        >
          {eyebrow}
        </EyebrowLabel>
      ) : null}
      {title ? (
        <h4
          style={{
            margin: subtitle ? "0 0 2px" : "0 0 8px",
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            ...(featured
              ? {
                  background: "var(--grad-text)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent"
                }
              : { color: "var(--text)" })
          }}
        >
          {title}
        </h4>
      ) : null}
      {subtitle ? (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-2)",
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: "0.04em",
            marginBottom: 10
          }}
        >
          {subtitle}
        </div>
      ) : null}
      {children
        ? children
        : bullets
          ? (
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                color: "var(--text-2)",
                fontSize: 13.5,
                lineHeight: 1.6,
                display: "grid",
                gap: 8
              }}
            >
              {bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )
          : body
            ? (
              <p
                style={{
                  margin: 0,
                  color: "var(--text-2)",
                  fontSize: 13.5,
                  lineHeight: 1.55
                }}
              >
                {body}
              </p>
            )
            : null}
      {meta ? (
        <div style={{ marginTop: 14 }}>
          <MetaPill>{meta}</MetaPill>
        </div>
      ) : null}
      {footer ? <div style={{ marginTop: 14 }}>{footer}</div> : null}
      {ctaLabel ? (
        <div
          style={{
            marginTop: body || bullets ? 14 : 0,
            fontSize: 13,
            fontWeight: 500,
            color: featured ? "var(--primary)" : "var(--text)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6
          }}
        >
          {ctaLabel}
          <Icon name="arrow-right" size={14} />
        </div>
      ) : null}
    </>
  );

  if (href) {
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="feature-card"
          style={cardStyle}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className="feature-card" style={cardStyle}>
        {inner}
      </Link>
    );
  }

  return (
    <div className="feature-card" style={cardStyle}>
      {inner}
    </div>
  );
}
