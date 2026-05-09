import type { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { AuthProvider } from "./AuthProvider";
import { ReportProvider } from "./ReportContext";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { ReportModal } from "./ReportModal";
import { TweaksPanel } from "./TweaksPanel";

/**
 * Public site shell — providers + nav + footer + modal + (dev) tweaks panel.
 * Server component shell; the providers below are all `"use client"`.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  const isDev = process.env.NODE_ENV !== "production";
  return (
    <ThemeProvider>
      <AuthProvider>
        <ReportProvider>
          <TopNav />
          <main>{children}</main>
          <Footer />
          <ReportModal />
          {isDev ? <TweaksPanel /> : null}
        </ReportProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
