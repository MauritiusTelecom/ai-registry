import type { ReactNode } from "react";
import { getBranding } from "@airegistry/core/branding";
import { AuthProvider } from "@airegistry/ui-kit";
import { ReportProvider } from "./ReportContext";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { ReportModal } from "./ReportModal";
import { TweaksPanel } from "./TweaksPanel";

/**
 * Public site shell - providers + nav + footer + modal + (dev) tweaks panel.
 * Server component shell; the React-context providers below are all `"use client"`.
 *
 * Brand strings (registry name, footer copy) and the logo come from
 * `getBranding()` - DB overrides set via /admin/branding fall back to the env
 * `REGISTRY_NAME` and built-in footer defaults when unset.
 */
export async function SiteShell({ children }: { children: ReactNode }) {
  const isDev = process.env.NODE_ENV !== "production";
  const branding = await getBranding();
  return (
    <AuthProvider>
      <ReportProvider>
        <TopNav registryName={branding.registryName} logoUrl={branding.logoUrl} />
        <main>{children}</main>
        <Footer
          registryName={branding.registryName}
          logoUrl={branding.logoUrl}
          copyrightLine={branding.copyrightLine}
          buildLine={branding.buildLine}
        />
        <ReportModal />
        {isDev ? <TweaksPanel /> : null}
      </ReportProvider>
    </AuthProvider>
  );
}
