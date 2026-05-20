# Installation

End-to-end setup for a local AI Registry development environment. For the architectural overview see [`README.md`](README.md); for portal structure and customization after install see [`CUSTOMIZATION.md`](CUSTOMIZATION.md); for the per-deployment configuration contract see **Section 3** below.

## 1. Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 20+ | Runtime. The monorepo's `package.json` declares `engines.node >= 20`. |
| pnpm | 9+ | Workspace + script runner. Declared as `packageManager` in the root `package.json` so Corepack picks the exact version. |
| PostgreSQL | 14+ | Registry data store. The bundled `docker-compose.yml` provisions a local instance. |
| Docker / Docker Compose | recent | Optional — only needed if you don't have your own Postgres. |
| git | any | Repo + submodule operations. |

### Installing pnpm

Pick whichever fits your environment:

- **Corepack (bundled with Node 16+):**

  ```bash
  corepack enable
  corepack prepare pnpm@9.12.0 --activate
  ```

  On Windows this needs an Administrator shell because Corepack writes shims into `C:\Program Files\nodejs\`. If you hit `EPERM`, use one of the alternatives below.

- **Windows (no admin):**

  ```powershell
  winget install pnpm.pnpm
  ```

- **macOS / Linux (no admin):**

  ```bash
  curl -fsSL https://get.pnpm.io/install.sh | sh -
  ```

Confirm: `pnpm --version` should print `9.12.0` or later.

## 2. Clone and install

```bash
git clone https://github.com/<your-org>/ai-registry.git
cd ai-registry
pnpm install
```

`pnpm install` walks all workspace packages declared in `pnpm-workspace.yaml` (currently `apps/*`, `packages/*`, `extensions/*`) and links them. The lockfile is `pnpm-lock.yaml` at the root — do not regenerate it with `npm` or `yarn`.

## 3. Configure the deployment

The **single source of truth** for runtime configuration is one `.env` file at the monorepo root.

```bash
cp .env.example .env
```

Then edit `.env` and fill in at minimum:

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL DSN; must expose a schema named `registry` | `postgresql://airegistry:airegistry-dev@localhost:5432/airegistry?schema=registry` |
| `REGISTRY_NAME` | Display name | `Mauritius AI Registry` |
| `PORTAL_DOMAIN` | Public portal hostname (no scheme, no trailing slash) | `airegistry.mu` |
| `API_BASE_URL` | Base URL of the REST API | `https://airegistry.mu/api/v1` |
| `JURISDICTION` | ISO / local jurisdiction code | `MU` |
| `IDENTITY_DOMAIN` | AIR-ID namespace authority | `air.mu` |
| `OPERATOR_NAME` | Deploying operator | `Mauritius Telecom` |
| `SUPPORTED_LANGUAGES` | Comma-separated BCP-47 codes | `en,fr,mfe` |
| `DEFAULT_LANGUAGE` | One of `SUPPORTED_LANGUAGES` | `en` |
| `RESOURCE_TYPES` | Comma-separated resource type codes | `model,agent,tool,skill` |

See `.env.example` for the full list (auth, mail, contact-form templates, operator alerts, etc.).

### How the single `.env` is loaded

- **The portal (`apps/portal`)** loads it in `apps/portal/next.config.mjs` via `dotenv` before Next's own env logic runs. This covers `pnpm dev`, `pnpm build`, and `pnpm start`.
- **Prisma + seed (`packages/core`)** loads it via `dotenv-cli` with `-e ../../.env` in every script in `packages/core/package.json`. This covers `pnpm prisma:generate`, `pnpm prisma:migrate`, `pnpm db:push`, `pnpm db:seed`, `pnpm db:bootstrap`, `pnpm deploy:db`.

You do **not** need a `.env` inside `apps/portal/` or `packages/core/`. If you find one, remove it — the bridge logic above already loads the root one, and a per-package `.env` will silently shadow the root values and cause hard-to-debug drift.

Validate the config before booting:

```bash
pnpm config:validate
```

This prints the resolved deployment values and exits non-zero if anything's missing.

## 4. Bring up PostgreSQL

If you already have Postgres, set `DATABASE_URL` in `.env` to point at it and skip to step 5.

Otherwise, use the bundled compose file:

```bash
docker compose up -d postgres
```

This creates a database named `airegistry` with user `airegistry`/`airegistry-dev` listening on port 5432. The `docker/postgres/init/01-create-schema.sql` script creates the `registry` schema that the Prisma schema expects.

## 5. Bootstrap the database

```bash
pnpm prisma:generate        # generates the Prisma client into packages/core/src/generated/prisma
pnpm db:push                # creates the registry schema in place from prisma/schema.prisma
pnpm db:seed                # loads reference taxonomies + an exemplar provider
```

Or in one shot:

```bash
pnpm db:bootstrap           # generate + push (--skip-generate) + seed
```

For an established database with committed migrations, use `pnpm prisma:migrate` instead of `pnpm db:push`.

## 6. Run the portal

```bash
pnpm --filter @airegistry/portal dev
```

The dev server boots on http://localhost:3002. The public portal lives at `/`; role workspaces are under `/admin`, `/provider`, `/verifier`, `/sovereign`.

For a Turborepo-cached, parallel dev (useful once more workspace packages exist):

```bash
pnpm dev
```

## 7. Smoke-test

Once the dev server is up:

```bash
pnpm smoke
```

Hits the Phase 5 surface (`/api/health`, `/.well-known/ai-registry`, `/api/resources`, `/api/resolve`, `/api/mcp`) against the running app. Set `BASE=http://host:port` to point elsewhere.

## 8. Customize your portal

After the dev server is running, tailor the public site without editing code:

1. **Validate config** — `pnpm config:validate`
2. **Set deployment variables** in the root `.env` (`REGISTRY_NAME`, `PORTAL_DOMAIN`, `OPERATOR_NAME`, `JURISDICTION`, optional `JURISDICTION_DISPLAY_NAME`, `OPERATOR_CONTACT_*`, etc.). See `.env.example`.
3. **Apply schema + seed** (if not done) — `pnpm db:push` and `pnpm db:seed`
4. **Sign in as admin** — open **`/admin/branding`** for logo, footer, operator contact, jurisdiction label, privacy act, and open-source repo URL (DB overrides merge over `.env`).
5. **Edit home marketing blocks** — `/admin/site/faq`, `/admin/site/how-it-works`, `/admin/site/listing-criteria`, `/admin/site/promo` (promo starts disabled until you enable it in admin).
6. **Extensions** — plugins load by default; add `PLUGINS_ENABLED=false` to `.env` if you do not want the hello demo banner on the home page.

Step-by-step structure, route map, what still requires a code fork, and branding field reference: **[`CUSTOMIZATION.md`](CUSTOMIZATION.md)**.

## Common commands

| Task | Command |
|---|---|
| Install / update deps | `pnpm install` |
| Dev (parallel) | `pnpm dev` |
| Dev (portal only) | `pnpm --filter @airegistry/portal dev` |
| Build everything | `pnpm build` |
| Build a single package | `pnpm --filter @airegistry/<pkg> build` |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Validate `.env` | `pnpm config:validate` |
| Smoke-test public API | `pnpm smoke` |
| Test transactional email rendering | `pnpm test:emails` |
| Test SMTP connectivity | `pnpm test:smtp` |
| Prisma generate / validate / format | `pnpm prisma:generate`, `pnpm prisma:validate`, `pnpm prisma:format` |
| Apply committed migrations | `pnpm prisma:migrate` |
| Push schema in dev (no migration files) | `pnpm db:push` |
| Seed | `pnpm db:seed` |
| Bootstrap (generate + push + seed) | `pnpm db:bootstrap` |
| Reset (DESTRUCTIVE: drop + push + seed) | `pnpm db:reset` |
| Clean caches | `pnpm clean` |

Turborepo caches `build`, `lint`, and `typecheck` outputs — repeats are fast unless inputs change.

## Troubleshooting

### `pnpm: command not found`

pnpm isn't on PATH. See **Installing pnpm** above. On Windows after `winget install`, you must close and reopen PowerShell so PATH refreshes.

### `EPERM: operation not permitted, open 'C:\Program Files\nodejs\...'`

Corepack needs Administrator on Windows because it writes shims into the Node install dir. Use `winget install pnpm.pnpm` (per-user, no admin) or run the corepack commands in an elevated PowerShell.

### Prisma: `Environment variable not found: DATABASE_URL`

Prisma is running without picking up the root `.env`. Causes:

- A `.env` exists inside `packages/core/` or `apps/portal/` and overrides the root one with empty / wrong values. Delete it.
- You ran `prisma generate` directly (`prisma generate` from inside `packages/core/`) instead of via the package script. Use `pnpm prisma:generate` — it routes through `dotenv-cli`.
- The root `.env` literally doesn't have `DATABASE_URL`. Compare with `.env.example`.

### Prisma: `Validation Error Count: N ... [Context: getConfig]`

The schema file failed to parse. If `N` is suspiciously close to your model count, the schema is probably truncated. Run `pnpm prisma:validate` for a cleaner error surface, and check that `packages/core/prisma/schema.prisma` is the expected length (~1157 lines for the current AIR-SPEC 0.4 schema).

### `ConfigError: Missing required environment variable ...`

The portal's `getConfig()` validator threw because a required variable from the table in **Section 3** is unset. The error names the missing variable; add it to your root `.env` and restart the dev server. Run `pnpm config:validate` to validate without booting Next.

### Build error: `Expected '</', got '<eof>'` (or similar parser errors)

A source file is truncated. This shouldn't happen on a normal clone but can occur after a partial rsync or interrupted file copy. The fix is to restore the file from a clean source (`git checkout -- path/to/file.tsx`).

### `pnpm install` complains about peer-dependency conflicts

`.npmrc` at the root sets `strict-peer-dependencies=false`. If you removed it, peer warnings become errors. Restore the file or pass `--strict-peer-dependencies=false`.

### Postgres connection refused

The compose container isn't up. `docker compose ps` to check; `docker compose up -d postgres` to start. If something else is bound to port 5432, change the host port: `POSTGRES_HOST_PORT=5433 docker compose up -d postgres` and update `DATABASE_URL` accordingly.

## Production deployment

The repo includes a deploy automation under `deploy/` (rsync + PM2) plus a one-shot `scripts/deploy.sh`. Both carry a `MONOREPO MIGRATION NOTICE` at the top because they were written for the pre-monorepo layout — see `MIGRATION.md` for the path changes required before re-using them. A reference rewrite as workspace-aware deploy scripts is on the v1.0 roadmap.
