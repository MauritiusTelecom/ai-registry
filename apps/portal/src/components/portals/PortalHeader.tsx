import type { SessionUser } from "@airegistry/sdk";
import { loadPortalNotifications } from "@/lib/portals/notifications";
import { PortalSearch } from "./header/PortalSearch";
// Palette is an operator/dev-only colour-token tool — removed from the
// portal header entirely. The component file remains in place for now in
// case it's reintroduced as a settings-page surface.
// import { PortalPalette } from "./header/PortalPalette";
import { PortalThemeToggle } from "./header/PortalThemeToggle";
import { PortalNotifications } from "./header/PortalNotifications";
import { PortalUserDropdown } from "./header/PortalUserDropdown";

/**
 * Shared role-portal header.
 *
 * Implements the chrome described in
 * `ai-registry-specs/shared/portal-chrome.md` §2 - breadcrumb on the left,
 * the icon row (search, palette, theme toggle, notifications) plus the user
 * dropdown on the right. Used by every per-portal wrapper:
 *
 *   - `PortalLayoutChrome`         → admin / verifier / sovereign
 *   - `ProviderPortalChrome`       → provider (adds a sub-crumb + banner)
 *
 * Per the spec, the dropdown's "Switch role" section lists every portal the
 * user can actually reach (`PortalUserDropdown` filters on `user.roles`,
 * with `admin` aliasing to all four).
 */
export type PortalHeaderProps = {
  /** Active portal label, e.g. "Admin", "Verifier". */
  label: string;
  /** Currently active portal id - drives the "current" tag in the dropdown. */
  currentRole: "admin" | "provider" | "verifier" | "sovereign";
  /** Optional secondary crumb (e.g. provider display name). */
  subCrumb?: string | null;
  /** Override the search placeholder. */
  searchPlaceholder?: string;
  user: SessionUser;
};

export async function PortalHeader({
  label,
  currentRole,
  subCrumb = null,
  searchPlaceholder,
  user
}: PortalHeaderProps) {
  // Notifications are scoped per-role on the server so a provider never
  // sees admin-flavoured entries (and vice versa). Read state is
  // persisted server-side via NotificationRead — see
  // /api/portal/notifications/{read,read-all}.
  const notifications = await loadPortalNotifications(user, currentRole);
  return (
    <header className="p-header">
      <div className="p-header-left">
        <div className="p-crumbs">
          <span className="p-crumb-active">{label}</span>
          {subCrumb ? (
            <>
              <span className="p-crumb-sep">/</span>
              <span>{subCrumb}</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="p-header-right">
        {/*
          Search is wired up to /api/portal/search (role-scoped). Provider
          portal gets it too so they can quick-jump to their own resources
          or portal pages. The palette icon was removed across all roles.
        */}
        <PortalSearch
          placeholder={
            searchPlaceholder ??
            (currentRole === "provider"
              ? "Search your resources, complaints, pages…"
              : currentRole === "admin"
                ? "Search resources, providers, pages, actions…"
                : "Search resources, providers, pages…")
          }
        />
        <PortalThemeToggle />
        <PortalNotifications initial={notifications} currentRole={currentRole} />
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
  );
}
