"use client";

import { Icon } from "@/components/public/Icon";
import { useTheme } from "@/components/public/ThemeProvider";

/**
 * Sun / moon theme toggle. Integrates with the existing root-level
 * ThemeProvider so toggling here also flips the public portal - the
 * `data-theme` attribute lives on `<html>` and is shared across the whole
 * app.
 */
export function PortalThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="p-icon-btn"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
    </button>
  );
}
