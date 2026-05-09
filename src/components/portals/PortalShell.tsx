import type { ReactNode } from "react";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth/current-user";
import type { PortalConfig } from "@/lib/portals/nav-config";
import { LogoutButton } from "@/components/public/auth/LogoutButton";
import { PortalSidebar } from "./PortalSidebar";

/**
 * Server-rendered shell for the role-specific portals.
 *
 * Composes:
 *   - PortalSidebar (client) — sidebar with active-link highlighting.
 *   - Top bar — breadcrumb + page title + user envelope + sign-out.
 *   - Main column — children (the route-specific page content).
 *
 * Each per-portal layout (admin / provider / verifier / sovereign) calls
 * `requireRole()` first and then renders this shell.
 */

export type PageHeader = {
  /** Crumbs above the title — e.g. ["Admin", "Operations", "Users"]. */
  breadcrumb: string[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function PortalShell({
  config,
  user,
  header,
  children
}: {
  config: PortalConfig;
  user: SessionUser;
  header: PageHeader;
  children: ReactNode;
}) {
  return (
    <div className="p-shell">
      <PortalSidebar config={config} />

      <div className="p-main">
        <header className="p-topbar">
          <div className="p-crumbs">
            {header.breadcrumb.map((crumb, i) => (
              <span key={i}>
                {i > 0 ? <span className="p-crumb-sep">·</span> : null}
                <span
                  className={i === header.breadcrumb.length - 1 ? "p-crumb-active" : ""}
                >
                  {crumb}
                </span>
              </span>
            ))}
          </div>

          <div className="p-user-block">
            <div className="p-user-text">
              <span className="p-user-name">{user.name}</span>
              <span className="p-user-role">
                {user.role.name}
                {user.provider ? ` · ${user.provider.displayName}` : ""}
              </span>
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="p-content">
          <div className="p-page-header">
            <h1 className="p-title">{header.title}</h1>
            {header.subtitle ? <p className="p-subtitle">{header.subtitle}</p> : null}
            {header.actions ? <div className="p-actions">{header.actions}</div> : null}
          </div>
          {children}
        </main>

        <footer className="p-footer">
          <span>
            Listing is not endorsement. The registry points; the provider operates; the
            hosting environment secures.
          </span>
          <Link href="/governance" className="p-footer-link">
            Governance charter →
          </Link>
        </footer>
      </div>
    </div>
  );
}
