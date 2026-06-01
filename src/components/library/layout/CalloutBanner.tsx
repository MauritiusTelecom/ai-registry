import type { ReactNode } from "react";

/**
 * Single-line gradient highlight strip used below a card grid to summarise
 * the section's takeaway. Replaces the inline
 *
 *   <div style={{
 *     padding: '16px 22px', borderRadius: 12,
 *     border: '1px solid var(--border-strong)',
 *     background: 'linear-gradient(90deg, rgba(var(--primary-rgb),0.08), rgba(var(--tertiary-rgb),0.08))',
 *     textAlign: 'center'
 *   }}>
 *
 * pattern. Two intents: `accent` (primary→tertiary, the marketing default)
 * and `neutral` (subtle panel).
 */
export function CalloutBanner({
  children,
  intent = "accent",
  marginTop = 24,
  align = "center"
}: {
  children: ReactNode;
  intent?: "accent" | "neutral";
  marginTop?: number;
  align?: "left" | "center";
}) {
  const background =
    intent === "accent"
      ? "linear-gradient(90deg, rgba(var(--primary-rgb),0.08), rgba(var(--tertiary-rgb),0.08))"
      : "var(--panel)";
  return (
    <div
      style={{
        marginTop,
        padding: "16px 22px",
        borderRadius: 12,
        border: "1px solid var(--border-strong)",
        background,
        textAlign: align,
        color: "var(--text-2)",
        fontSize: 14,
        lineHeight: 1.55
      }}
    >
      {children}
    </div>
  );
}
