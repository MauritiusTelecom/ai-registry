# Customizing an AI Registry deployment

This guide helps operators change branding, marketing content, visuals, or behavior **without modifying** [`packages/core`](packages/core/) (the stable kernel). For package boundaries see [`GOVERNANCE.md`](GOVERNANCE.md) §11.

## Quick decision guide

| What you want to change | Approach | Modify core? |
|------------------------|----------|--------------|
| Registry name, jurisdiction, languages, API URLs | Root [`.env`](.env.example) + `pnpm config:validate` | No |
| Operator name, contact email, office, hours on `/contact` and legal copy | `OPERATOR_NAME` (+ optional `OPERATOR_CONTACT_*` in `.env`) and `/admin/branding` | No |
| Logos, footer copy, hero eyebrow | `/admin/branding` (DB `SiteBranding` + env fallbacks) | No |
| FAQ, how-it-works, listing criteria, promo banner | `/admin/site/*` (public CMS) | No |
| Colors, typography, spacing | Override [`@airegistry/ui-kit/tokens.css`](packages/ui-kit/src/tokens.css) | No |
| Marketing pages, public shell, home layout | Fork or replace [`@airegistry/public`](packages/public/) | No |
| New REST routes, UI slots, scheduled jobs | Add under [`extensions/`](extensions/) (see hello example) | Extend only |
| Admin/provider workflows, API route layout | Fork [`apps/portal`](apps/portal/) | No (keep core dep) |
| Data model, governance rules, audit primitive | Upstream PR to `@airegistry/core` | Yes |

## Layer 1 — Configuration and branding (no code)

1. Copy `.env.example` to `.env` and set deployment variables (`REGISTRY_NAME`, `PORTAL_DOMAIN`, `OPERATOR_NAME`, `JURISDICTION`, etc.).
2. Optionally set operator contact defaults (all optional; sensible fallbacks apply when unset):
   - `OPERATOR_CONTACT_EMAIL` — sidebar on `/contact`
   - `OPERATOR_OFFICE_NAME` — defaults to `OPERATOR_NAME`
   - `OPERATOR_OFFICE_ADDRESS` — multiline; use `\n` between lines in `.env`
   - `OPERATOR_CONTACT_HOURS`
3. Run `pnpm config:validate`.
4. Sign in as admin and open **`/admin/branding`** for DB overrides (registry name, logo, footer, hero chip, and operator/contact fields). Values merge in `getBranding()` as **DB → `.env` → built-in default**.
5. After pulling schema changes that extend `SiteBranding`, run `pnpm db:push`.

## Layer 2 — Public CMS (no fork)

Editable marketing blocks live in the `public_cms` schema. Admins manage them at:

- `/admin/site/faq`
- `/admin/site/how-it-works`
- `/admin/site/listing-criteria`
- `/admin/site/promo`

Run `pnpm db:push` and `pnpm db:seed` after pulling schema changes.

## Layer 3 — Theming

Load a stylesheet after `@airegistry/ui-kit/tokens.css` (and optionally [`@airegistry/public/theme.css`](packages/public/src/theme/theme.css)) that overrides CSS variables. Do not add hard-coded hex values in forked portal components when a token exists.

## Layer 4 — Extensions

Extensions ship an [`airegistry-plugin.json`](extensions/examples/hello/airegistry-plugin.json) validated against `@airegistry/sdk/plugin`.

- REST handlers mount at `/api/ext/<plugin-id>/...`
- UI slots use `<PluginSlot id="..." />` from `@airegistry/plugin-host/slot` (server pages only; load plugins in root layout)

Reference: [`extensions/examples/hello/`](extensions/examples/hello/).

Enable or disable at runtime:

```bash
# Plugins load by default; set to disable:
PLUGINS_ENABLED=false
```

## Layer 5 — Fork the public site

The default app mounts public routes from **`apps/portal/src/app/(public)/`** as thin re-exports of `@airegistry/public/pages/*`.

To replace the marketing site:

1. Fork [`packages/public`](packages/public/) (keep the package name `@airegistry/public` or update `apps/portal` imports).
2. Leave `apps/portal` API routes and role workspaces (`app/(workspaces)/`) unchanged.

## Layer 6 — Fork the full portal

Fork [`apps/portal`](apps/portal/) for deep changes to admin/provider/verifier/sovereign UX. Continue depending on `@airegistry/core` and `@airegistry/sdk`; avoid deep imports into `@airegistry/core/lib/...` (not SemVer-stable).

## App Router layout

| Route group | Path prefix | Chrome |
|-------------|-------------|--------|
| `(public)` | `/`, `/registry`, `/login`, … | `SiteShell` from `@airegistry/public` |
| `(workspaces)` | `/admin`, `/provider`, `/verifier`, `/sovereign`, `/portal` | Per-role `PortalLayoutChrome` |
| `api/` | `/api/*` | — |

Route groups do not appear in URLs.

## Further reading

- [`packages/public/README.md`](packages/public/README.md) — public package layout
- [`packages/core/README.md`](packages/core/README.md) — kernel boundary
- [`packages/sdk/README.md`](packages/sdk/README.md) — extension API
- [`docs/open-source/extension-point-design.md`](docs/open-source/extension-point-design.md) — extension contract (draft)
- [`MIGRATION.md`](MIGRATION.md) — monorepo migration notes
