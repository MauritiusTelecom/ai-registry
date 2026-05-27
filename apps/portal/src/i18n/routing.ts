import { defineRouting } from "next-intl/routing";
import { resolveLocaleConfig, type UiLocale } from "./locale-config";

const { locales, defaultLocale } = resolveLocaleConfig();

export const routing = defineRouting({
  locales: locales as [UiLocale, ...UiLocale[]],
  defaultLocale,
  localePrefix: "as-needed",
  /** Use DEFAULT_LANGUAGE from .env; do not override from Accept-Language. */
  localeDetection: false
});

export type Locale = (typeof routing.locales)[number];
