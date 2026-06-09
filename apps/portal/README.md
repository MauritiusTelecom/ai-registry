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

Route groups control layout only — they **do not** appear in URLs.

| Segment | Example URLs | Layout / chrome |
|---------|--------------|-----------------|
| `(public)/` | `/`, `/registry`, `/contact`, `/login` | `SiteShell` from `@airegistry/public` |
| `(workspaces)/` | `/admin`, `/provider`, `/verifier`, `/sovereign`, `/portal` | Per-role workspace chrome |
| `api/` | `/api/resources`, `/api/ext/hello/ping` | — |

### Public route shims

Each public URL is a thin re-export of `@airegistry/public/pages/*`, e.g.

```ts
// src/app/(public)/page.tsx
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

## Dev

```bash
pnpm --filter @airegistry/portal dev   # http://localhost:3002
```

Root `.env` is loaded via `next.config.mjs` — do not maintain a separate `apps/portal/.env`. See [`INSTALL.md`](../../INSTALL.md).

## UI text test and pre-commit

Public **homepage** sign-off copy is in [`messages/validated-text.json`](messages/validated-text.json). `pnpm ai_registry_test` smoke-tests the portal: all public routes (EN + FR), registry/provider detail when listed, and admin/provider/verifier/sovereign sidebars when auth credentials allow.

`scripts/ai-registry-test.ts` checks:

1. **Validated text** — homepage keys in `en.json` / `fr.json` match `validated-text.json`.
2. **Public routes** — all marketing pages under `(public)/` plus `/registry/{slug}` and `/providers/{slug}` when the DB has rows; nav, footer, locale switcher, and page copy (EN + FR).
3. **Workspaces** (with login env) — admin, provider, verifier, and sovereign sidebars (skipped if the test account lacks that role).

```bash
pnpm ai_registry_test
```

**Requirement:** the portal must be running on **http://localhost:3002** (`pnpm dev`) before you commit or run the test manually. If the server is down, `server present` fails and the hook blocks the commit.

Pre-commit (`.githooks/pre-commit`, enabled via `pnpm install:hooks`) runs the same test automatically. Any **FAIL** blocks `git commit`. After copy is approved, update `validated-text.json` together with `en.json` / `fr.json`.
