import type { ReactNode } from "react";
import type { PortalConfig } from "@/lib/portals/nav-config";
import type { SessionUser } from "@airegistry/sdk";
import { getBranding } from "@/lib/branding";
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
export async function PortalLayoutChrome({
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
  const branding = await getBranding();

  return (
    <div className="p-shell">
      <PortalSidebar
        config={config}
        branding={{ registryName: branding.registryName, logoUrl: branding.logoUrl }}
      />

      <div className="p-main">
        <PortalHeader label={config.label} currentRole={currentRole} user={user} />

        {/*
          Pages own their inner layout. New portal pages opt into the
          portal-style page shell via `<div className="p-content">…</div>`;
          older pages use the public PageHero pattern. Both work.
        */}
        <main>{children}</main>
      </div>
    </div>
  );
}
