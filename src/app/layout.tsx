import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { getConfig } from "@/lib/config";
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

  return (
    <html lang="en" suppressHydrationWarning data-theme={theme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
