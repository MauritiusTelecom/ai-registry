# Monorepo migration — what changed and what you must do

This repo was a single Next.js + Prisma app. It is now a **pnpm + Turborepo monorepo** with:

| Path | Package | Purpose |
|---|---|---|
| `packages/core/` | `@airegistry/core` | Prisma schema + migrations, deployment config, governance, audit, discovery, validators, email |
| `packages/sdk/` | `@airegistry/sdk` | Public types and plugin manifest schema for extensions |
| `packages/ui-kit/` | `@airegistry/ui-kit` | Design tokens placeholder; full kit lands later |
| `apps/portal/` | `@airegistry/portal` | The Next.js portal (public site, admin/provider/verifier/sovereign workspaces) |
| `extensions/` | — | In-tree reference extensions (none yet) |

## Path mapping

| Old path | New path |
|---|---|
| `src/app/` | `apps/portal/src/app/` |
| `src/components/` | `apps/portal/src/components/` |
| `src/middleware.ts` | `apps/portal/src/middleware.ts` |
| `src/lib/branding.ts` | `apps/portal/src/lib/branding.ts` |
| `src/lib/theme-cookie.ts` | `apps/portal/src/lib/theme-cookie.ts` |
| `src/lib/public-origin.ts` | `apps/portal/src/lib/public-origin.ts` |
| `src/lib/portal/`, `src/lib/portals/` | `apps/portal/src/lib/portal/`, `…/portals/` |
| `src/lib/config.ts` | `packages/core/src/lib/config.ts` |
| `src/lib/prisma.ts` | `packages/core/src/lib/prisma.ts` |
| `src/lib/email.ts`, `src/lib/email/` | `packages/core/src/lib/email.ts`, `…/email/` |
| `src/lib/validators.ts` | `packages/core/src/lib/validators.ts` |
| `src/lib/with-base.ts` | `packages/core/src/lib/with-base.ts` |
| `src/lib/audit/`, `governance/`, `discovery/`, `contacts/`, `admin/`, `auth/` | `packages/core/src/lib/…/` |
| `src/prisma/schema.prisma` | `packages/core/prisma/schema.prisma` |
| `src/prisma/migrations/` | `packages/core/prisma/migrations/` |
| `src/prisma/seed.ts` | `packages/core/prisma/seed.ts` |
| `src/generated/` | `packages/core/src/generated/` |
| `next.config.mjs`, `next-env.d.ts` | `apps/portal/` |
| `public/` | `apps/portal/public/` |
| `tsconfig.json` (root) | replaced by `tsconfig.base.json` (root) + per-package `tsconfig.json` |

## ⚠️ Cleanup you must do (Claude could not delete files)

The migration was performed by **copy** because the workspace sandbox could only create files, not delete them. The originals are still on disk and must be removed by hand before `pnpm install` runs:

```powershell
# PowerShell, from D:\src\AIRegistry\ai-registry
Remove-Item -Recurse -Force src
Remove-Item -Force next.config.mjs, next-env.d.ts, tsconfig.json, tsconfig.tsbuildinfo, package-lock.json
Remove-Item -Recurse -Force public, .next, node_modules

# Stray file left behind by an early sandbox test
Remove-Item -Force packages\core\src\lib\test.txt
```

Bash equivalent:

```bash
cd ai-registry
rm -rf src public .next node_modules
rm -f next.config.mjs next-env.d.ts tsconfig.json tsconfig.tsbuildinfo package-lock.json
rm -f packages/core/src/lib/test.txt
```

Once that's done:

```bash
pnpm install
pnpm prisma:generate
pnpm --filter @airegistry/portal dev   # http://localhost:3002
```

## What the new commands look like

| Old | New |
|---|---|
| `npm run dev` | `pnpm dev` (turbo, parallel) or `pnpm --filter @airegistry/portal dev` |
| `npm run build` | `pnpm build` |
| `npm run prisma:generate` | `pnpm prisma:generate` |
| `npm run db:seed` | `pnpm db:seed` |
| `npm run config:validate` | `pnpm config:validate` |
| `npm run smoke` | `pnpm smoke` |
| `npm run deploy` | `pnpm deploy` (deploy.sh needs path updates — see below) |

The root `package.json` proxies the most common commands to the right workspace package; the rest can be run with `pnpm --filter <pkg> <script>`.

## The path-alias bridge

To avoid rewriting ~176 source files that import from `@/lib/config`, `@/lib/prisma`, `@/lib/audit/…`, etc., the new `apps/portal/tsconfig.json` maps those historical paths to their new homes in `packages/core/src/lib/…`. Both old and new imports work:

```ts
// Old style — still works via tsconfig paths
import { prisma } from "@/lib/prisma";

// New style — preferred for new code, stable across the migration window
import { prisma } from "@airegistry/core";
```

Convert imports to the new style in PR-sized batches. The bridge will be removed after a deprecation window.

## Prisma changes

- Schema location: `packages/core/prisma/schema.prisma`
- Generator output: `packages/core/src/generated/prisma` (the `output` directive was updated)
- All Prisma commands are owned by `@airegistry/core`. Root scripts in `package.json` proxy to it via `pnpm --filter @airegistry/core …`.

## Single root `.env` (after cleanup pass)

The migration consolidates configuration onto a single `.env` at the monorepo root. Two pieces of wiring make that work:

- **Portal:** `apps/portal/next.config.mjs` imports `dotenv` and calls `loadDotenv({ path: path.join(monorepoRoot, ".env"), override: false })` before Next's own env logic runs. This means `pnpm dev`, `pnpm build`, and `pnpm start` all see the same env vars without needing a `.env` inside `apps/portal/`.
- **Prisma + seed:** every script in `packages/core/package.json` runs through [`dotenv-cli`](https://www.npmjs.com/package/dotenv-cli) with `-e ../../.env`. This covers `prisma:generate`, `prisma:validate`, `prisma:format`, `prisma:migrate`, `db:push`, `db:push:skip-generate`, `db:seed`, `db:reset`, `db:bootstrap`, `deploy:db`.

`dotenv-cli` is added as a dev-dep on `@airegistry/core`. The compound scripts (`db:bootstrap`, `deploy:db`) are chained as `pnpm <a> && pnpm <b>` rather than `sh -c "..."` so they run on Windows without git-bash.

You do **not** need a `.env` in `apps/portal/` or `packages/core/`. If one exists there it will silently shadow values from the root `.env` — delete it.

## Next.js changes (`apps/portal/next.config.mjs`)

Three additions you should know about:

- `outputFileTracingRoot` is set to the monorepo root so the standalone bundle picks up the workspace packages (notably the Prisma generated client under `packages/core/`).
- `transpilePackages: ["@airegistry/core", "@airegistry/sdk", "@airegistry/ui-kit"]` tells Next to compile the workspace packages on the fly; they ship as TS source, not built JS.
- `dotenv` is imported and the monorepo-root `.env` is loaded explicitly (see **Single root `.env`** above).

## Scripts that need attention before the next deploy

The deploy automation references the pre-monorepo layout. Both `scripts/deploy.sh` and `deploy/deploy.sh` now carry a `MONOREPO MIGRATION NOTICE` at the top. The substantive changes you'll need to make:

- `scripts/deploy.sh` line ~70: `npm run build` → `pnpm --filter @airegistry/portal build`; `.next/BUILD_ID` → `apps/portal/.next/BUILD_ID`.
- `scripts/deploy.sh` line ~78 (rsync arglist): replace `.next src/generated src/prisma src/lib docker docker-compose.yml package.json package-lock.json next.config.mjs` with `apps/portal/.next packages/core/src/generated packages/core/prisma docker docker-compose.yml package.json pnpm-lock.yaml apps/portal/next.config.mjs packages/core/package.json apps/portal/package.json pnpm-workspace.yaml`.
- `deploy/deploy.sh` line ~187: `$REPO_ROOT/.next/static` → `$REPO_ROOT/apps/portal/.next/static`.
- `deploy/deploy.sh` line ~188-189: `$REPO_ROOT/public` → `$REPO_ROOT/apps/portal/public`.
- `deploy/deploy.sh` line ~194-197: `$REPO_ROOT/src/prisma` → `$REPO_ROOT/packages/core/prisma`.
- Anywhere the deploy uses `npm`: switch to `pnpm` (lockfile is now `pnpm-lock.yaml`).

I left these unchanged because they touch production rsync targets and PM2 wiring that I can't validate. Make the changes deliberately and test with `DRY_RUN=1 pnpm deploy` first.

## SQL files with stale path references

These contain *comments* referencing old paths. Cosmetic only — no functional change needed:

- `scripts/postgresql/postgres.sql`
- `deploy/sql/2026-05-14-add-notification-reads.sql`
- `docker/postgres/init/01-create-schema.sql`

## Known cosmetic glitches in the move

- The Prisma generated client copy in `packages/core/src/generated/` may be missing a handful of files compared with the original (35 source files vs 30 copied) because the cp was interrupted. **You don't need to fix this manually** — `pnpm prisma:generate` will produce a complete, correct client.
- An empty `packages/core/src/lib/test.txt` was left by a sandbox test. Delete it (see Cleanup section above).
- `apps/portal/src/app/layout.tsx` has no trailing newline. Functionally identical to the original; if you want it pristine, copy the file from a fresh git checkout.

## Post-mortem: the partial-cp file truncation

During the initial copy, the 45-second sandbox bash timeout interrupted `cp -a src/app …` mid-write across roughly 270 files. Most lost only a single trailing newline (cosmetic), but ~10 files lost real content — most damagingly `apps/portal/src/app/layout.tsx` (cut mid-JSX) and `packages/core/prisma/schema.prisma` (cut at line 1106 of 1157, leaving the schema unparseable and triggering Prisma's "Validation Error Count: 18 / [Context: getConfig]" output).

If you're re-running a similar migration in a constrained shell environment:

- Verify file integrity after every bulk copy. A SHA-256 diff against a known-good source (a fresh git clone of the same commit) catches every truncation in one pass.
- Don't rely on file counts alone — counts only verify presence, not completeness.
- Build artefacts that the shell cannot delete (`.next/dev/cache/turbopack/…`) will fight a `rm -rf` and abort scripts that use `set -e`. Either stop the dev server first or wrap such deletes in `|| true`.

## Verifying the migration

After cleanup and `pnpm install`:

```bash
pnpm prisma:generate
pnpm --filter @airegistry/core typecheck
pnpm --filter @airegistry/portal typecheck
pnpm --filter @airegistry/portal build
pnpm config:validate
```

If `typecheck` complains about a `@/lib/…` import that doesn't resolve, the path-alias bridge in `apps/portal/tsconfig.json` is missing an entry — add the appropriate mapping there.

## What is _not_ in this migration

This pass is structural only: it moves files and wires the workspace. It does NOT:

- Define the plugin loader runtime (only the manifest types in `@airegistry/sdk` are scaffolded).
- Add the `<PluginSlot>` primitive to the portal.
- Lift the design tokens from `ai-registry-prototype/` into `@airegistry/ui-kit/tokens.css` (placeholder only).
- Convert `@/lib/...` imports to `@airegistry/core/...` — that's a follow-up cleanup.

Those land in the v1.0 push outlined in the open-source rollout plan.

---

## Splitting the public portal out of `apps/portal` (in progress)

A second pass is now underway to make the public-portal half of `apps/portal` forkable independently of the admin/provider/verifier/sovereign workspaces. Same Next.js app, same `/api/*` surface; the boundary is a new workspace package that the app mounts at a `(public)` route group.

| PR | Status | Scope |
|---|---|---|
| **PR 1** | landed | Promote shared chrome primitives (`Icon`, `PageHero`, `AuthProvider`, `useAuth`, `ThemeProvider`, `useTheme`, `LogoutButton`, `theme-cookie`) to `@airegistry/ui-kit`. 50 files in `apps/portal/` rewired; originals left as deprecated one-line re-export shims until the sandbox can delete files. |
| **PR 2** | landed | Scaffold `@airegistry/public` workspace package. Declared deps on `@airegistry/core` + `@airegistry/sdk` + `@airegistry/ui-kit`; `apps/portal/package.json` and `next.config.mjs` updated to consume + transpile it. No code moved yet. |
| **PR 3** | landed | Moved 36 files from `apps/portal/src/components/public/` into `packages/public/src/{shell,sections,auth-ui}/`: 12 shell components (SiteShell, TopNav, Footer, Modal, ReportModal, ReportContext, Reveal, TweaksPanel, ProviderPortalFooterLink, ResourceReportButton, PrototypeHtmlPage, PrototypeHtmlRuntime), 18 section components, and 6 auth forms. Plus two cross-boundary moves: `lib/branding.ts` → `@airegistry/core/branding` (so the role-portal chrome and the public site reach it via the same import), and `lib/portals/public-hrefs.ts` → `@airegistry/public/lib/public-hrefs`. 24 routes under `app/` rewired to import from `@airegistry/public/...`. Originals left as one-line shims; `ChromeSwitch.tsx` retained as real code (PR 4 deletes it). Hotfix: `useCountUp.ts` was missed in the initial move and added in a follow-up; 13 section files had `from "../Reveal"` corrected to `from "../shell/Reveal"`. |
| **PR 4 (partial)** | landed — page extraction only | **Page-body extraction.** All 24 public-route page bodies moved into `packages/public/src/pages/{HomePage,RegistryListPage,RegistryDetailPage,ProvidersListPage,ProviderDetailPage,DocsPage,EcosystemPage,GovernancePage,LoginPage,RegisterPage,AuthResetRequestPage,AuthResetTokenPage,AuthVerifyPage,ContactPage,ContactVerifyPage,PricingPage,PrivacyPage,TermsPage,AcceptableUsePage,SovereigntyRubricPage,VerificationPage,WhitepaperPage,OpenDataPage,AuditLogPage}.tsx`. Each route file in `apps/portal/src/app/` is now a 300–400-byte thin re-export: `export { default, metadata, dynamic } from "@airegistry/public/pages/..."`. Two cross-boundary moves needed for this: (a) `portalForRole` (the only thing the LoginPage uses from `lib/portals/auth-gate.ts`) moved to `@airegistry/core/auth/portal-for-role`, with auth-gate re-exporting it for backward compat; (b) imports of `@airegistry/public/sections/X`, `@airegistry/public/shell/X`, `@airegistry/public/auth-ui/X`, `@airegistry/public/lib/X`, `@/lib/branding` were rewritten to relative `../sections/X` etc. (or `@airegistry/core/branding`) in the extracted files since they now live inside `packages/public`. Added `packages/public/src/pages/index.ts` barrel; main `@airegistry/public` index re-exports it. |
| **PR 4 (remainder)** | landed | `app/(public)/` and `app/(workspaces)/` route groups; `ChromeSwitch` removed; `(public)/layout.tsx` mounts `SiteShell`; deprecated `apps/portal/src/components/public/*` shims deleted (see `components/public/README.md`). |
| ~~PR 5~~ | folded into PR 3 | `public-hrefs.ts` moved as part of PR 3 because the moved `ProviderPortalFooterLink` needed it. |
| **PR 6a** | landed | **Public-CMS data layer.** Added `public_cms` Postgres schema to the existing multi-schema Prisma setup, with four editable-content models: `CmsFaqEntry` (collection, ordered), `CmsHowItWorksStep` (collection, ordered, with `highlight` flag), `CmsListingCriterion` (collection, ordered, optional `iconName`), `CmsPromoBanner` (singleton). Added `packages/core/src/lib/services/public-cms.ts` with typed read projections + audited upsert / delete / reorder helpers, exposed at `@airegistry/core/services/public-cms`. Seeded the FAQ, how-it-works, and promo-banner tables in `prisma/seed.ts` with the strings previously hardcoded in the section components; existing rows aren't overwritten on re-seed so admin edits survive `pnpm db:seed`. Wired `Faq.tsx` to read from the new table (split into server `Faq` + client `FaqClient` so the open/close interaction still works) with a hardcoded fallback if the DB is empty or unreachable. |
| **PR 6b** | landed | Wired the remaining sections to read from the CMS, same pattern as `Faq.tsx`: `HowItWorks.tsx` reads via `listActiveHowItWorksSteps`; `ListingCriteria.tsx` reads via `listActiveListingCriteria` (tone — pink / purple / cyan / emerald — is derived from `sortOrder % 4` so reordering rotates colours without a schema column); `Promo.tsx` reads the singleton via `getPromoBanner` and renders `null` when disabled. Each section keeps a hardcoded `FALLBACK_*` array as DB-empty / DB-down defence. Added listing-criteria seed to `prisma/seed.ts` (the four built-in sovereignty bases). |
| **PR 6c** | landed | **`/admin/site/*` CRUD.** Eleven admin pages (landing + list/new/edit for FAQ, how-it-works, listing-criteria + singleton-edit for promo banner), seven API routes (POST upsert + DELETE per collection table, PUT for the singleton), four client form components. New "Site content" group in the admin nav (between Operations and Reference Tables). All mutators go through the audited service helpers in `@airegistry/core/services/public-cms`, so `/admin/audit` shows every CMS change. The promo banner singleton starts disabled on a fresh deploy; switch it on at `/admin/site/promo`. Service layer was extended with `listAll*` and `delete*` for how-it-works and listing-criteria during this PR (PR 6a only shipped the read+upsert subset). |

### Public-CMS local bootstrap

After pulling PR 6a, run:

```powershell
cd D:\src\AIRegistry\ai-registry
pnpm install
pnpm --filter @airegistry/core prisma:generate    # picks up the four new CmsX models + the public_cms schema
pnpm --filter @airegistry/core db:push            # creates the public_cms schema and tables in PostgreSQL
pnpm --filter @airegistry/core db:seed            # populates Faq/HowItWorks/Promo with current hardcoded copy
pnpm --filter @airegistry/portal typecheck
pnpm --filter @airegistry/portal build
```

The schema is additive — existing `registry.*` tables are untouched.

### Why a workspace package, not a sibling `apps/public-site/`

The split keeps a single Next.js app — one deploy, one origin, one cookie jar, one bundle of `/api/*` route handlers. Shared chrome primitives are already in `@airegistry/ui-kit` (PR 1). The cleanest way to make the public site forkable without splitting deploys is to put its routes/components/sections behind a workspace-package boundary that the app mounts via `app/(public)/` route shims. If a hard deploy split is ever needed later, the PR-3 moves don't change — only PR 4 would differ (a second Next.js app instead of route groups).

### PR-1 cleanup carry-over

Same caveat as the original `src/` cleanup above — the workspace sandbox could not delete the original primitive source files, so they remain in `apps/portal/src/components/public/{Icon,AuthProvider,ThemeProvider,auth/LogoutButton,sections/PageHero}.tsx` and `apps/portal/src/lib/theme-cookie.ts` as deprecated one-line shims pointing at `@airegistry/ui-kit`. Delete by hand once consumers have migrated:

```powershell
# PowerShell, from D:\src\AIRegistry\ai-registry
Remove-Item -Force `
  apps\portal\src\components\public\Icon.tsx, `
  apps\portal\src\components\public\AuthProvider.tsx, `
  apps\portal\src\components\public\ThemeProvider.tsx, `
  apps\portal\src\components\public\auth\LogoutButton.tsx, `
  apps\portal\src\components\public\sections\PageHero.tsx, `
  apps\portal\src\lib\theme-cookie.ts
```

Also remove the `"@/lib/theme-cookie": ["./src/lib/theme-cookie"]` line from `apps/portal/tsconfig.json` paths.

### Stray sed temp files from the PR-1 rewrite pass

A `sed -i` attempt during the import-rewrite step failed mid-flight because the sandbox mount disallows rename, leaving four extension-less garbage files behind. They are NOT picked up by tsc (the `include` glob requires `.ts`/`.tsx`), but should be removed:

```powershell
Remove-Item -Force `
  apps\portal\src\app\sedK8Jfaa, `
  apps\portal\src\app\acceptable-use\sedAieDMn, `
  apps\portal\src\components\public\sedlYHCN0, `
  apps\portal\src\components\public\sections\sed1Q0Tjk
```
