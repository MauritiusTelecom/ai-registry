# @airegistry/public

The public-portal layer for AI Registry deployments. This package owns the public-facing half of a registry portal so operators can fork or replace it without touching the role workspaces.

**Operator guide:** [`CUSTOMIZATION.md`](../../CUSTOMIZATION.md) — project structure, when to change what, route map, and limitations.

## What lives here

| Subtree | Purpose |
|---|---|
| `src/pages/` | Page components consumed by `apps/portal/src/app/(public)/...` route shims. One file per public route: `HomePage`, `RegistryListPage`, `ProvidersListPage`, `DocsPage`, `EcosystemPage`, `GovernancePage`, `LoginPage`, `RegisterPage`, `ContactPage`, legal pages, etc. |
| `src/sections/` | Section components used inside pages: `Hero`, `RegistrySection`, `WhatGetsListed`, `ListingCriteria`, `HowItWorks`, `Promo`, `Faq`, `ProvidersSection`, `EcosystemContent`, `ContactContent`, `DocsContent`, etc. |
| `src/shell/` | Public site chrome: `SiteShell`, `TopNav`, `Footer`, `Modal`, `Reveal`, `TweaksPanel`, etc. |
| `src/auth-ui/` | Public-facing auth forms: `AuthShell`, `LoginForm`, `RegisterForm`, password reset flows. |
| `src/lib/` | `branding-context.tsx` (`usePublicBranding`), `page-metadata.ts`, `public-hrefs.ts`. |
| `src/theme/` | Public-site theming layered on top of `@airegistry/ui-kit/tokens.css`. |

## What does NOT live here

- Shared chrome primitives (`Icon`, `PageHero`, `LogoutButton`, `AuthProvider`, `ThemeProvider`) — `@airegistry/ui-kit` (role workspaces use them too).
- Role workspaces (`/admin`, `/provider`, …) — `apps/portal/src/app/(workspaces)/`.
- API route handlers — `apps/portal/src/app/api/`. The public site calls them in-process.

## Public routes (page → file)

Mounted by one-line shims under `apps/portal/src/app/(public)/`. URLs do not include the `(public)` group name.

| URL | Page component |
|-----|----------------|
| `/` | `pages/HomePage.tsx` |
| `/registry`, `/registry/[slug]` | `RegistryListPage`, `RegistryDetailPage` |
| `/providers`, `/providers/[slug]` | `ProvidersListPage`, `ProviderDetailPage` |
| `/contact` | `ContactPage` |
| `/ecosystem` | `EcosystemPage` |
| `/docs` | `DocsPage` |
| `/governance` | `GovernancePage` |
| `/login`, `/register`, `/auth/*` | Auth pages |
| `/privacy`, `/terms`, `/acceptable-use`, … | Legal / policy pages |

Full customization source per route: [`CUSTOMIZATION.md`](../../CUSTOMIZATION.md#public-portal-route-map).

## Home page sections (`/`)

Vertical order in `HomePage.tsx`:

| Section | Customization |
|---------|----------------|
| `Hero` | Branding — `/admin/branding` + `.env` (`heroEyebrowText`, jurisdiction, headline accent) |
| `PluginSlot` `public.home.hero.below` | Extensions — `PLUGINS_ENABLED` (hello demo when on) |
| `RegistrySection` | Branding jurisdiction line + mock preview rows in **code** |
| `WhatGetsListed` | **Hardcoded** TSX today |
| `ListingCriteria` | Public CMS — `/admin/site/listing-criteria` |
| `HowItWorks` | Public CMS — `/admin/site/how-it-works` |
| `Promo` | Public CMS — `/admin/site/promo` |
| `Faq` | Public CMS — `/admin/site/faq` |

## Branding in components

Merged values come from `@airegistry/core/branding` (`getBranding()`): **DB → `.env` → default**.

| Context | API |
|---------|-----|
| Server pages / async sections | `await getBranding()` |
| Client sections under `SiteShell` | `usePublicBranding()` from `src/lib/branding-context.tsx` |
| Page `<title>` / metadata | `generateMetadata()` + `src/lib/page-metadata.ts` |

`SiteShell` wraps the public layout with `BrandingProvider` so client sections (e.g. `RegistrySection`, `EcosystemContent` subsections) read the same deployment branding.

## Customisation tiers

Operators have six tiers (increasing scope). Details: [`CUSTOMIZATION.md`](../../CUSTOMIZATION.md).

1. **Configuration + branding** — `.env` + `/admin/branding`; no code.
2. **Public CMS** — `/admin/site/*` for FAQ, how-it-works, listing criteria, promo.
3. **Theming** — CSS variable overrides after `@airegistry/ui-kit/tokens.css`.
4. **Extensions** — `<PluginSlot id="..." />` + `extensions/` (see hello example). Disable with `PLUGINS_ENABLED=false`.
5. **Fork this package** — replace marketing pages, shell, or home layout.
6. **Fork `apps/portal`** — role workspaces and API layout (keep depending on `@airegistry/core`).

## Layout in the App Router

`apps/portal` mounts this package via route-group shims under `app/(public)/...`. Each shim is a one-line re-export, e.g.

```ts
// apps/portal/src/app/(public)/page.tsx
export { HomePage as default } from "@airegistry/public/pages/HomePage";
```

`(public)/layout.tsx` mounts `SiteShell` from `@airegistry/public/shell`; routes under `(workspaces)/` use per-role chrome.

## Status

**Landed:** pages, sections, shell, public-CMS-backed home blocks, branding provider, and `apps/portal` route-group shims. Extensions contribute UI via `<PluginSlot id="..." />` ([`@airegistry/plugin-host`](../../packages/plugin-host) and [`extensions/examples/hello`](../../extensions/examples/hello)).
