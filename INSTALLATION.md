# Installation

Operational guide for installing, configuring, and running the `ai-registry` reference implementation locally or against a deployment-managed PostgreSQL. For what the project is, scope boundaries, and architecture, see [`README.md`](README.md).

## Prerequisites

- **Node.js 20+.** The package set targets Node 24 typings; Next.js 16 + React 19 work on Node 20+.
- **PostgreSQL 14+** with a database that exposes a schema named `registry`. The bundled `docker-compose.yml` provisions this for local development.
- **npm.** The lockfile is npm-format; do not substitute `pnpm` or `yarn` without regenerating it.

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Copy and edit environment
cp .env.example .env
# edit DATABASE_URL and the deployment-config block - see "Configuration"

# 3. Bring up the database (optional - only if you don't already have Postgres)
docker compose up -d postgres

# 4. Generate the Prisma client and apply migrations
npm run prisma:generate
npm run prisma:migrate            # production-style: applies committed migrations
# OR for first-time bootstrap on an empty db:
npm run db:push                   # creates the schema in-place from prisma/schema.prisma

# 5. Seed reference taxonomies + one exemplar provider with one resource per type
npm run db:seed

# 6. Run the dev server
npm run dev                       # http://localhost:3002
```

`npm run dev` starts Next.js on **port 3002** (matching `.speckit/implementation_plan.md`). The public portal lives at `/`; module-specific portals (admin / provider / verifier / sovereign) ship in Phases 3–4.

## Configuration

Configuration is **deployment-specific** and lives in environment variables. The runtime config module at `src/lib/config.ts` reads these, validates them, and exposes a typed object for the rest of the app. **No default in the code references Mauritius**; the reference deployment supplies these values in its own environment.

| Key | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL DSN; must point at a database that exposes a schema named `registry`. |
| `REGISTRY_NAME` | yes | Display name (e.g. `Mauritius AI Registry`). |
| `PORTAL_DOMAIN` | yes | Hostname of the public portal (e.g. `airegistry.mu`). |
| `API_BASE_URL` | yes | Base URL of the REST API (e.g. `https://airegistry.mu/api/v1`; reference also accepts `/api/`). |
| `JURISDICTION` | yes | ISO or local jurisdiction code (e.g. `MU`). |
| `IDENTITY_DOMAIN` | yes | AIR-ID namespace authority (e.g. `air.mu`). |
| `OPERATOR_NAME` | yes | Deploying operator (e.g. `Mauritius Telecom`). |
| `SUPPORTED_LANGUAGES` | yes | Comma-separated BCP-47 codes (e.g. `en,fr,mfe`). |
| `DEFAULT_LANGUAGE` | yes | One of `SUPPORTED_LANGUAGES`. |
| `RESOURCE_TYPES` | yes | Comma-separated resource type codes (e.g. `model,agent,tool,skill`). |

Sample deploy configs live at `.env.example` (template) and `config/*.example.env` for shape comparisons (e.g. `config/mauritius.example.env`).

Run `npm run config:validate` after editing `.env` to confirm the config layer can load and validate without errors.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server on port 3002 with HMR. |
| `npm run build` | Production build. |
| `npm run start` | Run the built app on port 3002. |
| `npm run lint` | `next lint`. |
| `npm run prisma:generate` | Regenerate the Prisma client into `src/generated/prisma/`. |
| `npm run prisma:validate` | Validate `src/prisma/schema.prisma`. |
| `npm run prisma:format` | Format the schema file. |
| `npm run prisma:migrate` | `prisma migrate deploy` - apply committed migrations to the configured database. |
| `npm run db:push` | `prisma db push` - first-time bootstrap, no migration files. |
| `npm run db:seed` | Seed the database with reference taxonomies, an exemplar provider, and one resource per type (see `src/prisma/seed.ts`). |
| `npm run db:reset` | Drop the `registry` schema, re-push, and re-seed (development only - destructive). |
| `npm run config:validate` | Load and validate the deployment configuration without booting Next.js. |
| `npm run smoke` | Hit the Phase 5 adapter surface (`/api/health`, `/.well-known/ai-registry`, `/api/resources`, `/api/resolve`, `/api/mcp`) against the running app. Set `BASE=http://host:port` to point elsewhere. |
| `npm run smoke:extra` | Companion smoke for other unauthenticated public APIs (`/api/discover`, `/api/providers`, taxonomies, `/api/openapi`, `GET /api/mcp` → 405). Same `BASE` env as `smoke`. |

## Production deployment

For a built deployment instead of `npm run dev`:

```bash
npm run build
npm run start        # serves the built app on port 3002
```

Set every required `Configuration` key in the production environment, run `npm run config:validate` to confirm load, then run `npm run prisma:migrate` against the production database before first boot.

## Operations

- **Health probes.** Point your load balancer / orchestrator readiness check at `GET /api/health`. The route returns `200 { status: "ok", db: "ok" }` on success and `503` when the DB is unreachable.
- **MCP integration.** Clients should `POST /api/mcp` with a JSON-RPC 2.0 message. Tools mirror the public REST surface; call `tools/list` to enumerate them. Streamable HTTP SSE streaming is reserved (the current handler returns `405` for `GET`).
- **Reverse proxy.** Set `API_BASE_URL` to the public scheme + host + base path (e.g. `https://airegistry.mu/api`). The well-known document, OpenAPI document, and MCP `registry.well_known` tool all use this value to advertise endpoint templates. A proxy may also alias `/api/v1` → `/api` to satisfy AIR-SPEC §13's versioned base.
- **Smoke checks.** After deploy, run `BASE=https://your-host npm run smoke` and `npm run smoke:extra` to verify the public discovery surface end-to-end.

## Troubleshooting

- **`prisma:migrate` fails with "schema does not exist".** The `registry` schema must exist before migrations apply. On a fresh database, run `npm run db:push` once to create the schema, then switch to `npm run prisma:migrate` for subsequent deploys.
- **`config:validate` rejects `DEFAULT_LANGUAGE`.** It must be one of the codes in `SUPPORTED_LANGUAGES`. Both are comma-separated BCP-47.
- **Port 3002 already in use.** Free the port or override with `PORT=<n> npm run dev`. Update `API_BASE_URL` to match if you change it.
- **`/api/health` returns 503.** Database is unreachable. Verify `DATABASE_URL`, network reachability, and that the `registry` schema is present.
