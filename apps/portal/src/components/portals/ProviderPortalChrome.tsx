import type { ReactNode } from "react";
import Link from "next/link";
import type { SessionUser } from "@airegistry/sdk";
import type { PortalConfig } from "@/lib/portals/nav-config";
import { getBranding } from "@/lib/branding";
import { PortalSidebar } from "./PortalSidebar";
import { PortalHeader } from "./PortalHeader";
import { ProviderRegistrationBanner } from "./ProviderRegistrationBanner";

/**
 * Provider-specific portal chrome. Layers the provider-only registration
 * banner on top of the shared `PortalHeader`.
 *
 * The header is identical to the one used by admin / verifier / sovereign
 * (search, palette, theme toggle, notifications, user dropdown) - only the
 * sub-crumb (provider display name) and the inline registration banner are
 * provider-specific. See `ai-registry-specs/shared/portal-chrome.md` for
 * the normative description.
 */
export async function ProviderPortalChrome({
  config,
  user,
  children
}: {
  config: PortalConfig;
  user: SessionUser;
  children: ReactNode;
}) {
  // A provider-only user sees `provider`; admins viewing the provider portal
  // still see `admin` so the dropdown highlights their primary identity.
  const isAdmin = user.roles.includes("admin");
  const currentRole: "admin" | "provider" = isAdmin ? "admin" : "provider";
  const branding = await getBranding();

  return (
    <div className="p-shell">
      <PortalSidebar
        config={config}
        branding={{ registryName: branding.registryName, logoUrl: branding.logoUrl }}
      />

      <div className="p-main">
        <PortalHeader
          label={config.label}
          currentRole={currentRole}
          subCrumb={user.provider?.displayName ?? null}
          searchPlaceholder="Search resources, complaints, contacts…"
          user={user}
        />

        <ProviderRegistrationBanner
          emailVerified={user.emailVerified}
          canAuthorResources={user.canAuthorResources}
        />

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
