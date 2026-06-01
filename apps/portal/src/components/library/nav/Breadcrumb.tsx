import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";

/**
 * Crumb trail rendered above a page title. Matches the `.p-crumbs` look
 * used by the portal shell - middot separators, the last crumb shown
 * with `.p-crumb-active`.
 *
 *   <Breadcrumb crumbs={[
 *     { label: 'Admin', href: '/admin' },
 *     { label: 'Registry' },
 *     { label: 'Resources', href: '/admin/resources' }
 *   ]} />
 */

export type Crumb = {
  label: ReactNode;
  /** When omitted the crumb is rendered as plain text (the active page). */
  href?: string;
};

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length === 0) return null;
  return (
    <div className="p-crumbs" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span
            key={i}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {i > 0 ? <span className="p-crumb-sep" aria-hidden>·</span> : null}
            {c.href && !isLast ? (
              <Link
                href={c.href}
                style={{ color: "var(--text-2)", textDecoration: "none" }}
              >
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? "p-crumb-active" : undefined}>
                {c.label}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
