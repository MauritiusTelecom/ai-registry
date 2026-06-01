import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getBranding } from "@/lib/branding";
import { SAR_THEME_KEY, themeFromCookie, ThemeProvider } from "@airegistry/ui-kit";
import { ensurePluginsLoaded } from "@/lib/plugins/ensure-loaded";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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
