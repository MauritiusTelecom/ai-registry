"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { useTransition } from "react";

export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSelectChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: 11,
        letterSpacing: "0.08em",
        color: "var(--text-3)",
        cursor: "pointer"
      }}
    >
      <span aria-hidden="true">🌐</span>
      <select
        value={locale}
        onChange={onSelectChange}
        disabled={isPending}
        style={{
          appearance: "none",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "4px 8px",
          fontFamily: "inherit",
          fontSize: "inherit",
          color: "var(--text-2)",
          cursor: "pointer"
        }}
      >
        {routing.locales.map((cur) => (
          <option key={cur} value={cur}>
            {t(cur)}
          </option>
        ))}
      </select>
    </label>
  );
}
