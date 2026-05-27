import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";

/**
 * Headline metric tile - used on the portal dashboards. Mirrors the
 * prototype's `StatCard` visual: large number, label, optional delta.
 *
 * When `href` is provided the entire card becomes a clickable Link to that
 * route — the dashboard tiles on the provider portal use this so a single
 * click on, say, "Open complaints" jumps straight to /provider/complaints.
 */
export function StatCard({
  label,
  value,
  hint,
  intent,
  href
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  intent?: "positive" | "neutral" | "warning";
  href?: string;
}) {
  const body = (
    <>
      <div className="p-stat-label">{label}</div>
      <div className="p-stat-value">{value}</div>
      {hint ? (
        <div className={`p-stat-hint ${intent ?? "neutral"}`}>{hint}</div>
      ) : null}
    </>
  );

  if (href) {
    // `feature-card` gives the same gradient-ring glow used on the public
    // home cards (.pillar / .r-card) via the shared CSS rule in globals.css.
    return (
      <Link
        href={href}
        className="p-stat-card p-stat-card-link feature-card"
        aria-label={label}
      >
        {body}
      </Link>
    );
  }
  return <div className="p-stat-card">{body}</div>;
}
