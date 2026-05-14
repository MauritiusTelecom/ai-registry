import type { CSSProperties, ReactNode } from "react";

/**
 * Bare card frame - panel background, border, padding, radius. No glow,
 * no icon, no tone variants. Use for one-off content that doesn't fit the
 * `FeatureCard` mould (e.g. the federation diagram in `/ecosystem`).
 *
 * For richer cards (icon tile, eyebrow, gradient-ring hover), prefer
 * `FeatureCard` from `library/content`.
 */
export function Card({
  children,
  padding = 22,
  radius = 14,
  borderStrong = false,
  style,
  className
}: {
  children: ReactNode;
  padding?: number;
  radius?: number;
  /** Use `--border-strong` instead of the default `--border`. */
  borderStrong?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`feature-card${className ? ` ${className}` : ""}`}
      style={{
        padding,
        borderRadius: radius,
        border: `1px solid ${borderStrong ? "var(--border-strong)" : "var(--border)"}`,
        background: "var(--panel)",
        ...style
      }}
    >
      {children}
    </div>
  );
}
