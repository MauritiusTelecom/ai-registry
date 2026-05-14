import type { CSSProperties, ReactNode } from "react";

/**
 * Portal-style panel frame - uses the `--p-card` / `--p-border` token pair
 * rather than the public-site `--panel` / `--border` pair. Pick `Panel`
 * when the surrounding context is a role portal (`p-shell`), pick `Card`
 * when it's the public site.
 *
 * The visual difference is small but deliberate: portal panels read slightly
 * more dense and have a subtler glow.
 */
export function Panel({
  children,
  padding = 16,
  radius = 12,
  style,
  className
}: {
  children: ReactNode;
  padding?: number;
  radius?: number;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        padding,
        borderRadius: radius,
        border: "1px solid var(--p-border, var(--border))",
        background: "var(--p-card, var(--panel))",
        ...style
      }}
    >
      {children}
    </div>
  );
}
