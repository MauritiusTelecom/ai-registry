import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { getConfig } from "@/lib/config";
import { isPortalPath } from "@/lib/portals/auth-gate";
import { SAR_THEME_KEY, themeFromCookie } from "@/lib/theme-cookie";
import { SiteShell } from "@/components/public/SiteShell";

// Title is sourced from the deployment configuration (REGISTRY_NAME) so the
// codebase ships no jurisdiction-specific default.
export async function generateMetadata(): Promise<Metadata> {
  const cfg = getConfig();
  return {
    title: cfg.registryName,
    description:
      "Sovereign AI Registry — public portal for the locally-governed AI Registry under AIR-SPEC 0.4."
  };
}

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const theme = themeFromCookie(jar.get(SAR_THEME_KEY)?.value);

  // Portal routes (/admin /provider /verifier /sovereign /portal) render
  // their own chrome (sidebar + per-portal header). The public TopNav +
  // Footer would double up on top of that, so we skip the SiteShell when
  // we're inside a portal. The middleware stamps `x-pathname` on every
  // request — see src/middleware.ts.
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const inPortal = isPortalPath(pathname);

  return (
    <html lang="en" suppressHydrationWarning data-theme={theme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body>{inPortal ? children : <SiteShell>{children}</SiteShell>}</body>
    </html>
  );
}
