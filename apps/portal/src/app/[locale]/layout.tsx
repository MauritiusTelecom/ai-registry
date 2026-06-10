import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getBranding } from "@/lib/branding";
import { withBase } from "@airegistry/core";
import { SAR_THEME_KEY, themeFromCookie, ThemeProvider } from "@airegistry/ui-kit";
import { ensurePluginsLoaded } from "@/lib/plugins/ensure-loaded";
import { getConfiguredOrigin } from "@/lib/public-origin";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  // Favicon follows the admin-uploaded logo (set in /admin/branding); falls back
  // to the bundled gradient mark when no logo is configured. withBase keeps the
  // href correct when the app is mounted under a sub-path deployment.
  const iconHref = withBase(branding.logoUrl ?? "/favicon.svg");
  const origin = getConfiguredOrigin();
  const title = branding.registryName;
  // Distinct, accurate description so search engines replace any stale cached
  // snippet from whatever previously lived on this domain.
  const description = `${branding.registryName} - the trusted registry for sovereign AI in ${branding.jurisdictionDisplayName}. Discover verified, locally-governed AI resources: models, agents, datasets and skills. Operated by ${branding.operatorName}.`;
  const ogImage = branding.logoUrl ? withBase(branding.logoUrl) : `${origin}/favicon.svg`;
  return {
    metadataBase: new URL(origin),
    title: {
      default: title,
      template: `%s · ${title}`
    },
    description,
    applicationName: title,
    alternates: { canonical: "/" },
    icons: { icon: iconHref, shortcut: iconHref, apple: iconHref },
    openGraph: {
      type: "website",
      siteName: title,
      title,
      description,
      url: origin,
      images: [{ url: ogImage }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage]
    }
  };
}

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  setRequestLocale(locale);

  await ensurePluginsLoaded();

  const jar = await cookies();
  const theme = themeFromCookie(jar.get(SAR_THEME_KEY)?.value);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning data-theme={theme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
