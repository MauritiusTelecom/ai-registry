import type { SessionUser } from "@/lib/auth/current-user";
// Notification bell is temporarily hidden — the dropdown's mark-as-read state
// is not persisted yet (no NotificationRead table / endpoint). Re-enable
// once persistence is wired up. See PortalHeader render for the commented
// JSX and the surrounding context.
// import { loadPortalNotifications } from "@/lib/portals/notifications";
import { PortalSearch } from "./header/PortalSearch";
import { PortalPalette } from "./header/PortalPalette";
import { PortalThemeToggle } from "./header/PortalThemeToggle";
// import { PortalNotifications } from "./header/PortalNotifications";
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
  // Notifications fetch is commented out alongside the bell render below —
  // see the header for the full reason. Re-enable once read-receipts are
  // persisted server-side.
  // const notifications = await loadPortalNotifications(user, currentRole);
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
          Search + palette are operator/dev tools and are hidden from the
          provider portal until the command-palette index is wired up.
          The placeholder modal was also surfacing an unwanted grey
          empty-state container — removing the button removes that
          surface entirely for providers.
        */}
        {currentRole !== "provider" ? (
          <PortalSearch
            placeholder={
              searchPlaceholder ?? "Search resources, providers, audit…"
            }
          />
        ) : null}
        {currentRole !== "provider" ? <PortalPalette /> : null}
        <PortalThemeToggle />
        {/*
          Notification bell hidden for now — the dropdown's "Mark all
          read" / per-item dismiss is currently client-state only, so
          the unread badge would reappear on every refresh and the
          "read" affordance would mislead the user. Re-enable once a
          NotificationRead table + API persist the state per user.
          (See the conversation note on schema + endpoint design.)

          <PortalNotifications initial={notifications} />
        */}
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
