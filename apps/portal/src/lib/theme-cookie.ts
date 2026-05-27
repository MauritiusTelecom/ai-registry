/**
 * DEPRECATED — `SAR_THEME_KEY`, `themeFromCookie`, `ThemeMode` have moved to
 * `@airegistry/ui-kit`.
 *
 * This file is a re-export shim left behind because the workspace sandbox
 * could not delete files during the PR-1 migration (see MIGRATION.md). The
 * `@/lib/theme-cookie` path alias in apps/portal/tsconfig.json continues to
 * resolve through this shim during the deprecation window. Remove this file
 * (and the tsconfig alias) when the deprecation window closes.
 */
export {
  SAR_THEME_KEY,
  themeFromCookie,
  type ThemeMode
} from "@airegistry/ui-kit";
