"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { useTransition } from "react";

/**
 * EN/FR toggle for workspace portals — mirrors the public TopNav control so
 * operators and providers can switch language without leaving the portal.
 */
export function PortalLocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const otherLocale =
    (routing.locales as readonly Locale[]).find((l) => l !== locale) ??
    (locale === "fr" ? "en" : "fr");

  function switchTo() {
    startTransition(() => {
      router.replace(pathname, { locale: otherLocale });
    });
  }

  return (
    <button
      type="button"
      className="p-icon-btn"
      onClick={switchTo}
      disabled={isPending}
      aria-label={t("label")}
      title={t(otherLocale)}
      style={{
        fontSize: 11,
        fontFamily: "IBM Plex Mono, monospace",
        letterSpacing: "0.06em",
        fontWeight: 600,
        minWidth: 32
      }}
    >
      {otherLocale.toUpperCase()}
    </button>
  );
}
