import type { MetadataRoute } from "next";
import { getConfiguredOrigin } from "@/lib/public-origin";
import { routing } from "@/i18n/routing";

/**
 * /sitemap.xml — the public, indexable content pages. Excludes role
 * workspaces, auth flows, and action pages. One entry per page, with
 * per-locale `alternates.languages` (hreflang) so search engines map the
 * en/fr variants to each other. Resource detail pages are intentionally
 * omitted here; they can be added from the DB later if deep indexing is wanted.
 */

// Public page paths, relative to the locale root ("" = home).
const PUBLIC_PATHS = [
  "",
  "registry",
  "providers",
  "governance",
  "docs",
  "pricing",
  "terms",
  "privacy",
  "acceptable-use",
  "open-data",
  "whitepaper",
  "sovereignty-rubric",
  "ecosystem",
  "contact"
] as const;

/** Build a URL path for a locale, honouring `localePrefix: "as-needed"`. */
function localizedPath(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return path ? `${prefix}/${path}` : prefix || "/";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getConfiguredOrigin();
  return PUBLIC_PATHS.map((path) => {
    const languages = Object.fromEntries(
      routing.locales.map((locale) => [locale, `${origin}${localizedPath(locale, path)}`])
    );
    return {
      url: `${origin}${localizedPath(routing.defaultLocale, path)}`,
      changeFrequency: path === "" ? "daily" : "weekly",
      priority: path === "" ? 1 : 0.7,
      alternates: { languages }
    };
  });
}
