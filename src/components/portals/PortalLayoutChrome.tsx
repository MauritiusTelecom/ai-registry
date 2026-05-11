import type { ReactNode } from "react";
import Link from "next/link";
import type { PortalConfig } from "@/lib/portals/nav-config";
import type { SessionUser } from "@/lib/auth/current-user";
import { PortalSidebar } from "./PortalSidebar";
import { PortalHeader } from "./PortalHeader";

/**
 * Layout wrapper used by every per-portal `layout.tsx` other than the
 * provider portal (which adds the registration-banner via
 * `ProviderPortalChrome`). Renders the sidebar plus the shared rich header
 * (search, palette, theme toggle, notifications, user dropdown) once for
 * the entire portal subtree; per-page content lands inside `<main>`.
 *
 * The shared header is normative across all four role portals - see
 * `ai-registry-specs/shared/portal-chrome.md`.
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
  // For admin/verifier/sovereign the active role badge is the portal id.
  // Admins viewing another portal still see "admin" because the dropdown's
  // role filter aliases admin → every portal (PortalUserDropdown).
  const currentRole = user.roles.includes("admin") ? "admin" : config.role;

  return (
    <div className="p-shell">
      <PortalSidebar config={config} />

      <div className="p-main">
        <PortalHeader label={config.label} currentRole={currentRole} user={user} />

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
