# @airegistry/public

The public-portal layer for AI Registry deployments. This package owns the public-facing half of a registry portal so operators can fork or replace it without touching the role workspaces.

## What lives here

| Subtree | Purpose |
|---|---|
| `src/pages/` | Page components consumed by `apps/portal/src/app/(public)/...` route shims. One file per public route: `HomePage`, `RegistryListPage`, `ProvidersPage`, `DocsPage`, `EcosystemPage`, `GovernancePage`, `LoginPage`, `RegisterPage`, `AuthVerifyPage`, `ContactPage`, `PricingPage`, etc. |
| `src/sections/` | Section components used inside pages: `Hero`, `RegistrySection`, `WhatGetsListed`, `ListingCriteria`, `HowItWorks`, `Promo`, `Faq`, `ProvidersSection`, `GovernanceSection`, `EcosystemContent`, `Orchestration`, `ContactContent`, `DocsContent`, `DocPage`, `AirIdCopy`. |
| `src/shell/` | Public site chrome: `SiteShell`, `TopNav`, `Footer`, `Modal`, `ReportModal`, `ReportContext`, `Reveal`, `TweaksPanel`, `ProviderPortalFooterLink`, `PrototypeHtmlPage`, `PrototypeHtmlRuntime`, `ResourceReportButton`. |
| `src/auth-ui/` | Public-facing auth forms: `AuthShell`, `LoginForm`, `RegisterForm`, `RequestResetForm`, `ResendVerificationForm`, `ResetPasswordForm`. (Note: `LogoutButton` lives in `@airegistry/ui-kit` because the role portals use it too.) |
| `src/lib/` | Public-only helpers: `public-hrefs.ts` (formerly under `apps/portal/src/lib/portals/`), public-CMS readers added in PR 6. |
| `src/theme/` | Public-site theming layered on top of `@airegistry/ui-kit/tokens.css`. |

## What does NOT live here

- Shared chrome primitives (`Icon`, `PageHero`, `LogoutButton`, `AuthProvider`, `ThemeProvider`, `theme-cookie`) - those are in `@airegistry/ui-kit` because the role workspaces (`/admin`, `/provider`, `/verifier`, `/sovereign`, `/portal`) also import them.
- The role workspaces themselves - those stay under `apps/portal/src/app/(workspaces)/`.
- The API surface - all `/api/*` route handlers stay in `apps/portal/src/app/api/`. The public site calls them in-process; there is no cross-origin hop.

## Customisation

Operators have four tiers of customisation, in increasing scope:

1. **Configuration + branding.** No code: set the deployment `.env` and edit `SiteBranding` via `/admin/branding` in the admin workspace.
2. **Theming.** Override CSS variables from `@airegistry/ui-kit/tokens.css` in a deployment stylesheet loaded after the kit's tokens, or layer on `@airegistry/public/theme.css`.
3. **Slot overrides.** Drop an extension that contributes to `<PluginSlot id="...">` slots in the public site (slots ship in a future kit pass).
4. **Fork.** Replace this package with your own under the same name and `pnpm install`. The role workspaces in `@airegistry/portal` continue to work unchanged because they only depend on `@airegistry/core` and `@airegistry/ui-kit`.

## Layout in the App Router

`apps/portal` mounts this package via route-group shims under `app/(public)/...`. Each shim is a one-line re-export, e.g.

```ts
// apps/portal/src/app/(public)/page.tsx
export { HomePage as default } from "@airegistry/public/pages/HomePage";
```

`(public)/layout.tsx` mounts `SiteShell` from `@airegistry/public/shell`; role-workspace routes under `(workspaces)/...` mount their own chrome and do not see the public-site shell.

## Status

**Landed:** section components, shell, page bodies, public-CMS-backed sections, and `apps/portal` route-group shims under `app/(public)/` with `SiteShell` in `(public)/layout.tsx`. Extensions can contribute UI via `<PluginSlot id="..." />` (see `@airegistry/plugin-host` and `extensions/examples/hello`).
