import type { ReactNode } from "react";

/**
 * Headline metric tile — used on the portal dashboards. Mirrors the
 * prototype's `StatCard` visual: large number, label, optional delta.
 */
export function StatCard({
  label,
  value,
  hint,
  intent
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  intent?: "positive" | "neutral" | "warning";
}) {
  return (
    <div className="p-stat-card">
      <div className="p-stat-label">{label}</div>
      <div className="p-stat-value">{value}</div>
      {hint ? (
        <div className={`p-stat-hint ${intent ?? "neutral"}`}>{hint}</div>
      ) : null}
    </div>
  );
}
