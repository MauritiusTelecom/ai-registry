/**
 * Theme persistence for SSR: a server-rendered root layout reads this cookie
 * to seed `<html data-theme>`; the client-side `ThemeProvider` writes it on
 * change. The localStorage key uses the same string for legacy compatibility.
 *
 * This module is intentionally framework-agnostic — no React, no Next imports —
 * so it can be consumed from both server and client code in any portal that
 * embeds ui-kit's `ThemeProvider`.
 */
export const SAR_THEME_KEY = "sar-theme";

export type ThemeMode = "dark" | "light";

export function themeFromCookie(value: string | undefined): ThemeMode {
  return value === "light" ? "light" : "dark";
}
