import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@/components/public/SiteShell";
import { themeBootstrapScript } from "@/components/public/ThemeProvider";

export const metadata: Metadata = {
  title: "Sovereign AI Registry",
  description:
    "Sovereign AI Registry — public portal for the locally-governed AI Registry under AIR-SPEC 0.4."
};

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
        {/*
          Inline bootstrap to apply the saved theme attribute before the body paints,
          avoiding a flash of the wrong theme on hydration.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
