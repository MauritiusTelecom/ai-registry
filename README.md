# ai-registry

**Reference implementation** of the [AIR-SPEC 0.4](../ai-registry-specs/.speckit/specification.md) Mauritius AI Registry — a Next.js public portal, Provider/Admin/Verifier/Sovereign workspaces, and the PostgreSQL `registry` schema. Discovery is exposed via REST under `/api/...`; an MCP Streamable HTTP adapter at `/api/mcp` is on the Phase 5 roadmap.

The reference deployment is `airegistry.mu` (Mauritius Telecom as first reference operator). The codebase carries **no jurisdiction-specific defaults** — every deployment supplies its own `registry_name`, `jurisdiction`, `identity_domain`, `operator_name`, `default_language`, and resource-type set via configuration (see "Configuration" below).

> **Listing ≠ endorsement.** The registry points; the provider operates; the hosting environment secures. Public surfaces reflect this separation in copy, status labels, and footer disclaimer.

## Quickstart

Prerequisites:

- Node.js 20+ (package set targets Node 24 typings; Next.js 16 + React 19 work on Node 20+).
- PostgreSQL 14+ with a database that exposes a schema named `registry`. The bundled `docker-compose.yml` provisions this for local development.
- `npm` (the lockfile is npm-format).

```bash
# 1. Install
npm install

# 2. Copy and edit environment
cp .env.example .env
# edit DATABASE_URL and the deployment-config block — see "Configuration"

# 3. Bring up the database (optional — only if you don't already have Postgres)
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
| `npm run prisma:migrate` | `prisma migrate deploy` — apply committed migrations to the configured database. |
| `npm run db:push` | `prisma db push` — first-time bootstrap, no migration files. |
| `npm run db:seed` | Seed the database with reference taxonomies, an exemplar provider, and one resource per type (see `src/prisma/seed.ts`). |
| `npm run db:reset` | Drop the `registry` schema, re-push, and re-seed (development only — destructive). |
| `npm run config:validate` | Load and validate the deployment configuration without booting Next.js. |
| `npm run smoke` | Hit the Phase 5 adapter surface (`/api/health`, `/.well-known/ai-registry`, `/api/resources`, `/api/resolve`, `/api/mcp`) against the running app. Set `BASE=http://host:port` to point elsewhere. |

## Configuration

Configuration is **deployment-specific** and lives in environment variables. The runtime config module at `src/lib/config.ts` reads these, validates them, and exposes a typed object for the rest of the app. **No default in the code references Mauritius**; the reference deployment supplies them in its own environment.

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

## Architecture

| Layer | Source |
|---|---|
| Public portal (Home, Registry, Providers, Contact + footer-only Ecosystem/Governance/Documentation) | `src/app/` + `src/components/public/` |
| Authenticated portals (Admin, Provider, Verifier, Sovereign) | `src/app/portals/<role>/` (Phases 3–4) |
| REST API (discovery, AIR-ID resolve, well-known) | `src/app/api/` (Phase 3) |
| MCP adapter (Streamable HTTP) | `src/app/api/mcp/` (Phase 5) |
| Database schema (PostgreSQL `registry`) | `src/prisma/schema.prisma` |
| Seed data (reference taxonomies + exemplar provider) | `src/prisma/seed.ts` |
| Deployment configuration | `src/lib/config.ts` (typed accessor) + `.env` (values) |
| Prisma client singleton | `src/lib/prisma.ts` |

## Roadmap

Phased delivery is tracked in [`../ai-registry-specs/.speckit/implementation_plan.md`](../ai-registry-specs/.speckit/implementation_plan.md):

- **Phase 1 — Foundations and data model.** _In progress / mostly complete._ This README, the Prisma schema, the config layer, the seed script, and `docker-compose.yml` constitute the Phase 1 deliverables.
- **Phase 2 — Authentication and provider identity.** OIDC/OAuth-class sign-in; provider/admin/verifier/sovereign role separation; session linkage to `provider_id`.
- **Phase 3 — Public discovery (portal + REST).** REST list/detail/resolve/discover, `.well-known`, full localisation.
- **Phase 4 — Provider submission and governance workflows.** _Delivered (May 2026)._ Draft → submit pipeline gated by `canAuthorResources`, §11 reviewer checklist, lifecycle transitions, provider verification (`/api/admin/providers/{id}/verify`, T035), official-resource elevation (`/api/admin/resources/{id}/elevate`, T036), and audit instrumentation across every governance mutation.
- **Phase 5 — Adapters, conformance, hardening.** _Delivered (May 2026)._ Health probe (`/api/health`), MCP Streamable HTTP at `/api/mcp` exposing `registry.list / get / resolve / discover / well_known`, OpenAPI 3.0 document at `/api/openapi`, hardened validators in `src/lib/validators.ts`, and the smoke runner via `npm run smoke`.

### Operations

- **Health probes.** Point your load balancer / orchestrator readiness check at `GET /api/health`. The route returns `200 { status: "ok", db: "ok" }` on success and `503` when the DB is unreachable.
- **MCP integration.** Clients should `POST /api/mcp` with a JSON-RPC 2.0 message. Tools mirror the public REST surface; call `tools/list` to enumerate them. Streamable HTTP SSE streaming is reserved (the current handler returns `405` for `GET`).
- **Reverse proxy.** Set `API_BASE_URL` to the public scheme + host + base path (e.g. `https://airegistry.mu/api`). The well-known document, OpenAPI document, and MCP `registry.well_known` tool all use this value to advertise endpoint templates. A proxy may also alias `/api/v1` → `/api` to satisfy AIR-SPEC §13's versioned base.

## Repository conventions

- Open-source license: Apache-2.0 (see [`LICENSE`](LICENSE)).
- Contribution process and conduct: [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Security disclosure: [`SECURITY.md`](SECURITY.md).
- Governance and explicitly-out-of-scope list: [`GOVERNANCE.md`](GOVERNANCE.md).
- Specs are normative and live under [`../ai-registry-specs/`](../ai-registry-specs/).
- Design source-of-truth is the Claude prototype at [`../ai-registry-prototype/claudedesign/`](../ai-registry-prototype/claudedesign/) (the local copy carries the latest fixes; see `ai-registry-specs/.speckit/design.md`).

## License

Apache License 2.0 — see [`LICENSE`](LICENSE).
