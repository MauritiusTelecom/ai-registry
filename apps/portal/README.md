# @airegistry/portal

The default Next.js portal for the AI Registry reference implementation: public site, admin / provider / verifier / sovereign workspaces, REST API under `/api/...`, MCP Streamable HTTP adapter at `/api/mcp`.

**Operator guide:** [`CUSTOMIZATION.md`](../../CUSTOMIZATION.md) — structure, customization layers, phased checklist, route map.

## Dependencies

- `@airegistry/core` — Prisma schema, governance services, audit primitive, validators, transactional email, `getBranding()`.
- `@airegistry/public` — marketing pages and public site shell (mounted at `app/(public)/`).
- `@airegistry/ui-kit` — design tokens and headless components.
- `@airegistry/sdk` — types shared with extensions.
- `@airegistry/plugin-host` — extension loader (`/api/ext/*`, UI slots).

## App Router layout

All user-facing pages live under `src/app/[locale]/`. Route groups control layout only — they **do not** appear in URLs (the locale segment may be omitted for the default language; see [Localisation](#localisation)).

| Segment | Example URLs | Layout / chrome |
|---------|--------------|-----------------|
| `[locale]/(public)/` | `/`, `/registry`, `/contact`, `/login` | `SiteShell` from `@airegistry/public` |
| `[locale]/(workspaces)/` | `/admin`, `/provider`, `/verifier`, `/sovereign`, `/portal` | Per-role workspace chrome |
| `api/` | `/api/resources`, `/api/ext/hello/ping` | — (no locale prefix) |

### Public route shims

Each public URL is a thin re-export of `@airegistry/public/pages/*`, e.g.

```ts
// src/app/[locale]/(public)/page.tsx
export { HomePage as default } from "@airegistry/public/pages/HomePage";
export { generateMetadata } from "@airegistry/public/pages/HomePage";
```

Page bodies and sections live in [`packages/public`](../../packages/public/); this app only wires routes, API handlers, and workspace layouts.

## Admin entry points (customization)

| URL | Purpose |
|-----|---------|
| `/admin/branding` | `SiteBranding` — logo, footer, operator contact, jurisdiction, privacy act, repo URL |
| `/admin/site/faq` | Home FAQ (public CMS) |
| `/admin/site/how-it-works` | Home how-it-works steps |
| `/admin/site/listing-criteria` | Home listing criteria cards |
| `/admin/site/promo` | Home promo banner (singleton) |

Branding merges **DB → `.env` → default** in `@airegistry/core/branding`. See [`CUSTOMIZATION.md`](../../CUSTOMIZATION.md).

## Customisation tiers

1. **Configuration + branding** — root `.env` + `/admin/branding` (no code).
2. **Public CMS** — `/admin/site/*`.
3. **Theming** — CSS overrides after `@airegistry/ui-kit/tokens.css`.
4. **Extensions** — `extensions/` + `PLUGINS_ENABLED` (default on; set `false` to hide hello demo).
5. **Fork `@airegistry/public`** — marketing site only.
6. **Fork this app** — workspaces and API; keep `@airegistry/core` dependency.

## Path-alias bridge

During the monorepo migration, historical `@/lib/<core-module>` imports are aliased through [`tsconfig.json`](tsconfig.json) to `../../packages/core/src/lib/...`. New code should prefer `import { ... } from "@airegistry/core"` (or a curated subpath such as `@airegistry/core/governance`). See [`MIGRATION.md`](../../MIGRATION.md).

## Localisation

UI copy uses [next-intl](https://next-intl.dev/). Message bundles:

| File | Language |
|------|----------|
| [`messages/en.json`](messages/en.json) | English |
| [`messages/fr.json`](messages/fr.json) | French |

Config lives under [`src/i18n/`](src/i18n/):

| File | Role |
|------|------|
| `routing.ts` | Locales, default locale, URL prefix policy |
| `request.ts` | Loads the message bundle per request |
| `navigation.ts` | Locale-aware `Link`, `redirect`, `useRouter` |
| `locale-config.ts` | Maps `.env` → next-intl routing |

### Deployment language (`.env`)

| Variable | Effect |
|----------|--------|
| `SUPPORTED_LANGUAGES` | Comma-separated BCP-47 codes (e.g. `en,fr,mfe`). Only `en` and `fr` have UI message files today; others are ignored for routing. |
| `DEFAULT_LANGUAGE` | Default UI locale when the URL has no locale prefix. Values are normalized (`FR`, `fr`, `" fr "` → `fr`). Must appear in `SUPPORTED_LANGUAGES`. |

Example — French as the default deployment language:

```env
SUPPORTED_LANGUAGES="en,fr"
DEFAULT_LANGUAGE="fr"
```

Restart the portal after changing these variables (`pnpm --filter @airegistry/portal dev`).

**URL behaviour** (`localePrefix: as-needed`):

- If `DEFAULT_LANGUAGE=en`: `/registry` is English; `/fr/registry` is French.
- If `DEFAULT_LANGUAGE=fr`: `/registry` is French; `/en/registry` is English.

`localeDetection` is **off**: the app does not follow the browser `Accept-Language` header. Users switch language via the locale switcher (workspace header or public `TopNav`). Clear the `NEXT_LOCALE` cookie if an old choice persists during testing.

### What is localised

- **Public site** — home, registry, providers, auth, legal pages, marketing sections (`@airegistry/public`).
- **Workspaces** — admin, provider, verifier, sovereign, and end-user portal pages under `[locale]/(workspaces)/`.
- **Shared chrome** — sidebars, headers, auth forms, admin/provider grids and forms wired with `useTranslations` / `getTranslations`.

Resource and provider **names in the database** are not automatically translated unless you add separate CMS/localised fields (see [`data-model.md`](../../data-model.md)).

### Adding or editing strings

1. Add the key to `messages/en.json` and `messages/fr.json`.
2. In a Server Component: `const t = await getTranslations("namespace")`.
3. In a Client Component: `const t = useTranslations("namespace")`.
4. Prefer `@/i18n/navigation` for internal links so locale prefixes stay correct.

## Dev

```bash
pnpm --filter @airegistry/portal dev   # http://localhost:3002
```

Root `.env` is loaded via `next.config.mjs` — do not maintain a separate `apps/portal/.env`. See [`INSTALL.md`](../../INSTALL.md).
