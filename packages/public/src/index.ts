// @airegistry/public - the public-portal layer.
//
// This package holds everything that makes up the public-facing site of an
// AI Registry deployment: marketing pages, registry browse + discovery
// surface, governance / docs / ecosystem content, auth flows, and the site
// shell (TopNav, Footer, modals).
//
// Operators who want a custom marketing site fork or replace this package
// without touching the role workspaces (admin, provider, verifier,
// sovereign), which stay in @airegistry/portal. Shared chrome primitives
// (Icon, ThemeProvider, AuthProvider, PageHero, LogoutButton) live in
// @airegistry/ui-kit and are imported from there.
//
// Status: shell + sections + auth-ui + pages all landed (PR 3 + PR 4
// page-extraction). The remaining piece of the original PR 4 plan —
// app/(public) / app/(workspaces) route groups + ChromeSwitch removal —
// is deferred until file deletion is available locally; in the meantime
// apps/portal mounts each page via a one-line shim under app/<route>/.
//
// Subpath imports declared in package.json are the preferred form
// (@airegistry/public/sections/Hero, @airegistry/public/pages/HomePage,
// @airegistry/public/shell, etc.); this barrel is here for consumers
// that want the whole package at once.

export const PUBLIC_PACKAGE_VERSION = "0.1.0" as const;

export * from "./sections";
export * from "./shell";
export * from "./auth-ui";
export * from "./pages";
export { resolveProviderPortalPublicHref } from "./lib/public-hrefs";
