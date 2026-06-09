/** UI locales exposed in the router (only en/fr have dedicated message files). */
export const UI_MESSAGE_LOCALES = ["en", "fr"] as const;

export type UiLocale = (typeof UI_MESSAGE_LOCALES)[number];

/** Adaptive locale control: toggle (bilingual) or modal (3+). */
export const LOCALE_SWITCHER_THRESHOLDS = {
  toggleMax: 2
} as const;

export type LocaleSwitcherMode = "toggle" | "modal";

export function resolveLocaleSwitcherMode(localeCount: number): LocaleSwitcherMode {
  if (localeCount <= LOCALE_SWITCHER_THRESHOLDS.toggleMax) return "toggle";
  return "modal";
}

function primaryLanguageTag(code: string): string {
  return code.trim().toLowerCase().split("-")[0] ?? "en";
}

function parseCsv(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map((part) => primaryLanguageTag(part)).filter(Boolean);
}

/** en first, fr second, then alphabetical (by label when provided, else by code). */
export function sortUiLocales<T extends string>(
  locales: readonly T[],
  label?: (code: T) => string
): T[] {
  const rank = (code: string) => (code === "en" ? 0 : code === "fr" ? 1 : 2);
  return [...locales].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const la = label ? label(a) : a;
    const lb = label ? label(b) : b;
    return la.localeCompare(lb, "en", { sensitivity: "base" });
  });
}

/**
 * Resolves next-intl locales and default locale from deployment env
 * (DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES). Only locales listed in
 * UI_MESSAGE_LOCALES are exposed in the UI router.
 */
function supportedLanguagesFromEnv(): string[] {
  return parseCsv(
    process.env.SUPPORTED_LANGUAGES ?? process.env.NEXT_PUBLIC_SUPPORTED_LANGUAGES
  );
}

export function resolveLocaleConfig(): {
  locales: UiLocale[];
  defaultLocale: UiLocale;
} {
  const supported = supportedLanguagesFromEnv();
  const requestedDefault = primaryLanguageTag(
    process.env.DEFAULT_LANGUAGE ??
      process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE ??
      "en"
  );

  const locales = UI_MESSAGE_LOCALES.filter((code) =>
    supported.length === 0 ? true : supported.includes(code)
  );

  const effectiveLocales: UiLocale[] = sortUiLocales(
    locales.length > 0 ? locales : UI_MESSAGE_LOCALES
  );

  const defaultLocale: UiLocale = effectiveLocales.includes(requestedDefault as UiLocale)
    ? (requestedDefault as UiLocale)
    : effectiveLocales[0]!;

  return { locales: effectiveLocales, defaultLocale };
}
