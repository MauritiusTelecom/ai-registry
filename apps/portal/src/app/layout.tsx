import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { getBranding } from "@/lib/branding";
import { SAR_THEME_KEY, themeFromCookie, ThemeProvider } from "@airegistry/ui-kit";
import { ensurePluginsLoaded } from "@/lib/plugins/ensure-loaded";

// Title flows from /admin/branding overrides, falling back to the env
// REGISTRY_NAME so a fresh deployment still ships with sensible defaults.
export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: branding.registryName,
    description:
      "Mauritius AI Registry - public portal for the locally-governed AI Registry under AIR-SPEC 0.4."
  };
}

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  await ensurePluginsLoaded();

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
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
