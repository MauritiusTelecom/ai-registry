import type { SessionUser } from "@/lib/auth/current-user";
import { loadPortalNotifications } from "@/lib/portals/notifications";
import { PortalSearch } from "./header/PortalSearch";
import { PortalPalette } from "./header/PortalPalette";
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
  // sees admin-flavoured entries (and vice versa).
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
        <PortalSearch
          placeholder={
            searchPlaceholder ?? "Search resources, providers, audit…"
          }
        />
        {/* Palette is an operator/dev tool — hide it from the provider portal. */}
        {currentRole !== "provider" ? <PortalPalette /> : null}
        <PortalThemeToggle />
        <PortalNotifications initial={notifications} />
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
