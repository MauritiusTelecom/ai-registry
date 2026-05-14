import type { ReactNode } from "react";

/**
 * Single pill chip. Used in chip clouds (operator profiles, taxonomy tags).
 * Three tonal variants share the same shape — pick one per chip cloud rather
 * than mixing within a single group.
 *
 *   <Chip>National telcos</Chip>
 *   <Chip tone="tertiary">sovereign</Chip>
 */
export function Chip({
  children,
  tone = "primary",
  active = false,
  size = "md"
}: {
  children: ReactNode;
  tone?: "primary" | "secondary" | "tertiary" | "neutral";
  /** When true, the chip uses its solid-on-tone treatment (active state). */
  active?: boolean;
  size?: "sm" | "md";
}) {
  const toneRgb = {
    primary: "var(--primary-rgb)",
    secondary: "var(--secondary-rgb)",
    tertiary: "var(--tertiary-rgb)",
    neutral: "255, 255, 255"
  }[tone];

  const padding = size === "sm" ? "4px 10px" : "6px 12px";
  const fontSize = size === "sm" ? 11.5 : 12.5;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize,
        padding,
        borderRadius: 999,
        background: active
          ? `rgba(${toneRgb}, 0.22)`
          : `rgba(${toneRgb}, 0.08)`,
        border: `1px solid ${active ? `rgba(${toneRgb}, 0.45)` : "var(--border)"}`,
        color: "var(--text)",
        whiteSpace: "nowrap"
      }}
    >
      {children}
    </span>
  );
}
