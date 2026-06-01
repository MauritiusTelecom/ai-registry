import type { CSSProperties, ReactNode } from "react";

/**
 * Mono uppercase label used as a stratum / track / principle marker
 * (e.g. "Layer 01 · Discovery", "Principle 02", "Track 03").
 *
 * Distinct from `<PageSection eyebrow>`, which renders the bigger pill-style
 * `.eyebrow` section header with the animated dot. This is the inline
 * variant used inside cards.
 */
export function EyebrowLabel({
  children,
  tone = "muted",
  size = 11,
  marginBottom = 10,
  style
}: {
  children: ReactNode;
  /** `muted` is the default; `accent` colours the label with `--primary`. */
  tone?: "muted" | "accent";
  size?: number;
  marginBottom?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: size,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: tone === "accent" ? "var(--primary)" : "var(--text-2)",
        marginBottom,
        ...style
      }}
    >
      {children}
    </div>
  );
}
