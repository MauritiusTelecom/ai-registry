import type { ReactNode } from "react";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth/current-user";
import type { PortalConfig } from "@/lib/portals/nav-config";
import { ThemeProvider } from "@/components/public/ThemeProvider";
import { PortalSidebar } from "./PortalSidebar";
import { PortalSearch } from "./header/PortalSearch";
import { PortalPalette } from "./header/PortalPalette";
import { PortalThemeToggle } from "./header/PortalThemeToggle";
import { PortalNotifications } from "./header/PortalNotifications";
import { PortalUserDropdown } from "./header/PortalUserDropdown";

/**
 * Provider-specific portal chrome.
 *
 * Differs from the shared `PortalLayoutChrome` (still used by admin /
 * verifier / sovereign) in three ways:
 *
 *   1. The topbar is replaced with the rich header from the prototype's
 *      `portal-shell.jsx` — search button, accent-palette switcher, light/
 *      dark mode toggle, notifications dropdown, user dropdown with role
 *      switcher.
 *   2. The chrome wraps in `ThemeProvider` so the mode toggle works (the
 *      provider portal isn't nested under the public `SiteShell`'s
 *      ThemeProvider, so we need our own).
 *   3. The breadcrumb shows "Provider" only — pages render their own page
 *      header inside `.p-content`.
 *
 * Used only by `src/app/provider/layout.tsx`. The other portals continue
 * to use `PortalLayoutChrome` until they're upgraded similarly.
 */
export function ProviderPortalChrome({
  config,
  user,
  children
}: {
  config: PortalConfig;
  user: SessionUser;
  children: ReactNode;
}) {
  // Resolve the "current role" badge text. Provider users see "provider";
  // an admin viewing the provider portal sees "admin (viewing provider)".
  const isAdmin = user.roles.includes("admin");
  const isProvider = user.roles.includes("provider");
  const currentRole =
    isProvider && !isAdmin
      ? "provider"
      : isAdmin && isProvider
        ? "admin"
        : isAdmin
          ? "admin"
          : (user.role.code as string);

  return (
    <ThemeProvider>
      <div className="p-shell">
        <PortalSidebar config={config} />

        <div className="p-main">
          <header className="p-header">
            <div className="p-header-left">
              <div className="p-crumbs">
                <span className="p-crumb-active">{config.label}</span>
                {user.provider ? (
                  <>
                    <span className="p-crumb-sep">/</span>
                    <span>{user.provider.displayName}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="p-header-right">
              <PortalSearch placeholder="Search resources, complaints, contacts…" />
              <PortalPalette />
              <PortalThemeToggle />
              <PortalNotifications />
              <PortalUserDropdown
                user={{
                  name: user.name,
                  email: user.email,
                  roles: user.roles,
                  providerName: user.provider?.displayName ?? null
                }}
                currentRole={currentRole}
              />
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
    </ThemeProvider>
  );
}
