/**
 * Theme persistence for SSR: `RootLayout` reads this cookie; `ThemeProvider` writes it on change.
 * Matches legacy localStorage key `sar-theme`.
 */
export const SAR_THEME_KEY = "sar-theme";

export type ThemeMode = "dark" | "light";

export function themeFromCookie(value: string | undefined): ThemeMode {
  return value === "light" ? "light" : "dark";
}
