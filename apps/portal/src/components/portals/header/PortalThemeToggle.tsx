"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@airegistry/ui-kit";
import { useTheme } from "@airegistry/ui-kit";

/**
 * Sun / moon theme toggle. Integrates with the existing root-level
 * ThemeProvider so toggling here also flips the public portal - the
 * `data-theme` attribute lives on `<html>` and is shared across the whole
 * app.
 */
export function PortalThemeToggle() {
  const t = useTranslations("nav");
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="p-icon-btn"
      onClick={() => setTheme(next)}
      aria-label={t("switchTheme", { theme: next })}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
    </button>
  );
}
