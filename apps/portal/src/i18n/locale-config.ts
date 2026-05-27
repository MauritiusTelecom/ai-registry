/** UI locales that have next-intl message bundles under apps/portal/messages/. */
export const UI_MESSAGE_LOCALES = ["en", "fr"] as const;

export type UiLocale = (typeof UI_MESSAGE_LOCALES)[number];

function primaryLanguageTag(code: string): string {
  return code.trim().toLowerCase().split("-")[0] ?? "en";
}

function parseCsv(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map((part) => primaryLanguageTag(part)).filter(Boolean);
}

/**
 * Resolves next-intl locales and default locale from deployment env
 * (DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES). Only locales with message files
 * are exposed in the UI router.
 */
export function resolveLocaleConfig(): {
  locales: UiLocale[];
  defaultLocale: UiLocale;
} {
  const supported = parseCsv(process.env.SUPPORTED_LANGUAGES);
  const requestedDefault = primaryLanguageTag(process.env.DEFAULT_LANGUAGE ?? "en");

  const locales = UI_MESSAGE_LOCALES.filter((code) =>
    supported.length === 0 ? true : supported.includes(code)
  );

  const effectiveLocales: UiLocale[] =
    locales.length > 0 ? [...locales] : [...UI_MESSAGE_LOCALES];

  const defaultLocale: UiLocale = effectiveLocales.includes(requestedDefault as UiLocale)
    ? (requestedDefault as UiLocale)
    : effectiveLocales[0]!;

  return { locales: effectiveLocales, defaultLocale };
}
