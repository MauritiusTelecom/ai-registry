import type { ReactNode } from "react";

/**
 * Mono code-style metadata box - used to surface AIR-IDs, endpoints, and
 * other short technical strings inside a card.
 *
 *   <MetaPill>air://air.mu/model/legal-fr-mu</MetaPill>
 */
export function MetaPill({
  children,
  size = 12
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <div
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: size,
        color: "var(--text-2)",
        padding: "8px 10px",
        borderRadius: 8,
        background: "rgba(var(--primary-rgb), 0.06)",
        border: "1px solid var(--border)"
      }}
    >
      {children}
    </div>
  );
}
