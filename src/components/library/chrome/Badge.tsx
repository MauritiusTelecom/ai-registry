import type { ReactNode } from "react";

/**
 * Compact label badge. Smaller than `Chip`, no flex affordance, intended
 * for inline contextual markers (a "Tier-1" tag, a count, a state hint).
 *
 *   <Badge tone="warning">3 pending</Badge>
 */
export function Badge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
}) {
  const palette: Record<string, { bg: string; color: string; border: string }> = {
    neutral: {
      bg: "rgba(255,255,255,0.04)",
      color: "var(--text-2)",
      border: "var(--border)"
    },
    primary: {
      bg: "rgba(var(--primary-rgb), 0.12)",
      color: "var(--primary)",
      border: "rgba(var(--primary-rgb), 0.30)"
    },
    success: {
      bg: "rgba(16, 185, 129, 0.12)",
      color: "#10b981",
      border: "rgba(16, 185, 129, 0.30)"
    },
    warning: {
      bg: "rgba(245, 158, 11, 0.12)",
      color: "#f59e0b",
      border: "rgba(245, 158, 11, 0.30)"
    },
    danger: {
      bg: "rgba(239, 68, 68, 0.12)",
      color: "#ef4444",
      border: "rgba(239, 68, 68, 0.30)"
    }
  };
  const p = palette[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontFamily: "'IBM Plex Mono', monospace",
        letterSpacing: "0.04em",
        padding: "2px 8px",
        borderRadius: 6,
        background: p.bg,
        color: p.color,
        border: `1px solid ${p.border}`
      }}
    >
      {children}
    </span>
  );
}
