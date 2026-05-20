"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { SAR_THEME_KEY, type ThemeMode } from "./theme-cookie";

type Theme = ThemeMode;

type ThemeContextValue = {
  theme: Theme;
  setTheme: (next: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {}
});

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function writeThemeCookie(theme: Theme) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${SAR_THEME_KEY}=${theme};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax${secure ? ";Secure" : ""}`;
}

export function ThemeProvider({
  children,
  initialTheme
}: {
  children: ReactNode;
  /** Must match `RootLayout` cookie-derived `<html data-theme>` or hydration mismatches. */
  initialTheme: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(() => initialTheme);

  // Legacy: prefer localStorage if it disagrees with SSR cookie/html (one-time reconcile).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SAR_THEME_KEY);
      const htmlTheme = document.documentElement.getAttribute("data-theme");
      if ((stored === "light" || stored === "dark") && stored !== htmlTheme) {
        setThemeState(stored);
      }
    } catch {
      /* private mode etc. */
    }
  }, []);

  // Sync attribute, cookie (for next SSR), and localStorage whenever theme changes.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    writeThemeCookie(theme);
    try {
      window.localStorage.setItem(SAR_THEME_KEY, theme);
    } catch {
      // Storage may be blocked (private mode) - non-fatal.
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
