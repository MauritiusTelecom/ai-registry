import type { ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/public/auth/LogoutButton";
import type { PortalConfig } from "@/lib/portals/nav-config";
import type { SessionUser } from "@/lib/auth/current-user";
import { PortalSidebar } from "./PortalSidebar";

/**
 * Layout wrapper used by every per-portal `layout.tsx`. Renders the sidebar
 * and the topbar (breadcrumb + user envelope + sign-out) once for the
 * entire portal subtree; per-page content lands inside `.p-content`.
 *
 * The page-level header (title + subtitle + actions) is rendered by the
 * page itself via the `PortalShell` server component when it needs the
 * full PortalShell wrapper. For simple pages, the page can just render
 * its own content here.
 */
export function PortalLayoutChrome({
  config,
  user,
  children
}: {
  config: PortalConfig;
  user: SessionUser;
  children: ReactNode;
}) {
  return (
    <div className="p-shell">
      <PortalSidebar config={config} />

      <div className="p-main">
        <header className="p-topbar">
          <div className="p-crumbs">
            <span className="p-crumb-active">{config.label}</span>
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

        {/*
          Pages own their inner layout. New portal pages opt into the
          portal-style page shell via `<div className="p-content">…</div>`;
          older pages use the public PageHero pattern. Both work.
        */}
        <main>{children}</main>

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
