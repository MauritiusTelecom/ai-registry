import type { ReactNode } from "react";
import { getConfig } from "@/lib/config";
import { AuthProvider } from "./AuthProvider";
import { ReportProvider } from "./ReportContext";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { ReportModal } from "./ReportModal";
import { TweaksPanel } from "./TweaksPanel";

/**
 * Public site shell — providers + nav + footer + modal + (dev) tweaks panel.
 * Server component shell; the React-context providers below are all `"use client"`.
 *
 * Brand strings (registry name) flow from `src/lib/config.ts` (driven by
 * `REGISTRY_NAME` in `.env`) so the codebase carries no jurisdiction-specific
 * default. Forks change `.env`, never the components.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  const isDev = process.env.NODE_ENV !== "production";
  const cfg = getConfig();
  return (
    <AuthProvider>
      <ReportProvider>
        <TopNav registryName={cfg.registryName} />
        <main>{children}</main>
        <Footer registryName={cfg.registryName} />
        <ReportModal />
        {isDev ? <TweaksPanel /> : null}
      </ReportProvider>
    </AuthProvider>
  );
}
