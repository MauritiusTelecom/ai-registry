# ai-registry

**Reference implementation** of the [AIR-SPEC 0.4](../ai-registry-specs/.speckit/specification.md) — a Next.js public portal, Provider/Admin/Verifier/Sovereign workspaces, and the PostgreSQL `registry` schema. Discovery is exposed via REST under `/api/...`, plus an MCP Streamable HTTP adapter at `/api/mcp` (Phase 5).

The reference implementation tracks AIR-SPEC 0.4 as a **pnpm + Turborepo monorepo**: a stable `@airegistry/core`, a forkable `@airegistry/portal`, and forthcoming extension surfaces via `@airegistry/sdk`.

The reference deployment is [airegistry.mu](https://www.airegistry.mu) (Mauritius Telecom as first reference operator). The codebase carries **no jurisdiction-specific defaults** — every deployment supplies its own `registry_name`, `jurisdiction`, `identity_domain`, `operator_name`, `default_language`, and resource-type set via configuration.

> **Listing ≠ endorsement.** The registry points; the provider operates; the hosting environment secures. Public surfaces reflect this separation in copy, status labels, and footer disclaimer.

## What this is

An AI Registry is a jurisdiction-configured catalogue: it **lists, identifies, describes, and helps discover** AI resources that are locally relevant (for example models, agents, tools, and skills), with structured metadata and stable identifiers. It does **not** host workloads, run inference, authorize access to third-party provider APIs, or sit on the runtime path between consumers and providers.

## Monorepo layout

| Path | Package | Role |
|---|---|---|
| `packages/core/` | `@airegistry/core` | Prisma schema + migrations, deployment config, governance services, audit primitive, discovery queries, validators, transactional email. SemVer contract for downstream consumers. |
| `packages/sdk/` | `@airegistry/sdk` | Public types and plugin manifest schema for extensions and third-party portals. |
| `packages/ui-kit/` | `@airegistry/ui-kit` | Design tokens and shared headless components (`Icon`, `PageHero`, `AuthProvider`, `ThemeProvider`, `LogoutButton`) used by both the public site and the role workspaces. |
| `packages/public/` | `@airegistry/public` | Public-portal layer: marketing pages, registry browse + discovery surface, governance/docs/ecosystem pages, auth flows, site shell. Forkable independently of the role workspaces. |
| `packages/plugin-host/` | `@airegistry/plugin-host` | Extension runtime: loads `airegistry-plugin.json` manifests, mounts `/api/ext/*` REST handlers, registers UI slot components. |
| `apps/portal/` | `@airegistry/portal` | Default Next.js app. Mounts `@airegistry/public` at `app/(public)/` and role workspaces at `app/(workspaces)/`, plus REST `/api/...` and MCP `/api/mcp`. Forkable; theme via CSS variables. |
| `extensions/` | `@airegistry/extension-*` | In-tree reference extensions (e.g. [`extensions/examples/hello`](extensions/examples/hello)). See [`CUSTOMIZATION.md`](CUSTOMIZATION.md). |
| `ai-registry-specs/` (sibling repo) | — | Normative AIR-SPEC + module specs. |

## AIR identifiers

Listing identity uses the dedicated `air://` URI scheme (distinct from runtime workload identity such as `spiffe://`). Conventional shape:

```
air://{identity_domain}/{resource_type}/{provider_slug}/{resource_slug}
```

Example: `air://air.mu/skill/gov/mra-tax-calculator`. Grammar and constraints are normative in [AIR-SPEC 0.4](../ai-registry-specs/.speckit/specification.md).

## Status

This codebase implements **AIR-SPEC 0.4**. The specification and schema may still evolve, including **breaking** database changes addressed through Prisma migrations. The **`package.json` version** is the application release line, not the AIR-SPEC version (see [`GOVERNANCE.md`](GOVERNANCE.md) section 7).

## Product scope (summary)

**In scope:** public directory and discovery APIs; governance metadata (for example provider verification, sovereignty review, official-resource elevation); append-only audit for governance writes; localisation; adapters (MCP and future) as read-only **views** over the same catalogue data.

**Out of scope:** hosting inference or agents for third parties; acting as a runtime gateway or proxy; issuing runtime credentials for provider APIs; billing or marketplace settlement; legal certification or liability arbitration for providers. The authoritative list is in [`GOVERNANCE.md`](GOVERNANCE.md) (sections 2–3).

## Quickstart

Prerequisites: Node 20+, pnpm 9+, PostgreSQL 14+ (bundled `docker-compose.yml` provisions one).

```bash
pnpm install
cp .env.example .env             # edit DATABASE_URL + deployment config
docker compose up -d postgres
pnpm prisma:generate
pnpm db:push                     # or `pnpm prisma:migrate` against an established DB
pnpm db:seed
pnpm --filter @airegistry/portal dev    # http://localhost:3002
```

For a fuller walkthrough — prerequisites by OS, the full env-var list, postgres setup, smoke tests, troubleshooting — see [`INSTALL.md`](INSTALL.md).

## Common tasks

| Task | Command |
|---|---|
| Dev (portal + relevant deps) | `pnpm dev` |
| Build everything | `pnpm build` |
| Typecheck everything | `pnpm typecheck` |
| Lint everything | `pnpm lint` |
| Prisma generate / migrate / seed | `pnpm prisma:generate`, `pnpm prisma:migrate`, `pnpm db:seed` |
| Validate `.env` | `pnpm config:validate` |
| Smoke-test the public API | `pnpm smoke` |
| Per-package tasks | `pnpm --filter @airegistry/<pkg> <script>` |

## Three layers of customisation

The repo is designed so operators can deploy without forking:

1. **Configuration + branding (no code).** Set per-deployment values in `.env` (jurisdiction, identity domain, supported languages, etc.) and edit `SiteBranding` via `/admin/branding`. No defaults in code reference any specific deployment — the reference operator supplies them in their own environment.
2. **Theming.** Override CSS variables from `@airegistry/ui-kit/tokens.css` in a deployment stylesheet. No new gradients or hex literals are allowed in `apps/portal/`; the kit owns the tokens.
3. **Extensions / fork.** Drop a plugin under `extensions/` (manifest shape in `@airegistry/sdk/plugin`) for new REST routes, MCP tools, scheduled jobs, UI slots, or locale bundles. For deep redesigns, fork `packages/public` or `apps/portal` and continue to depend on `@airegistry/core`. See [`CUSTOMIZATION.md`](CUSTOMIZATION.md).

## Architecture

| Layer | Source |
|---|---|
| Public portal (Home, Registry, Providers, Contact + footer-only Ecosystem/Governance/Documentation) | `apps/portal/src/app/` + `apps/portal/src/components/public/` |
| Authenticated portals (Admin, Provider, Verifier, Sovereign) | `apps/portal/src/app/portals/<role>/` |
| REST API (discovery, AIR-ID resolve, well-known) | `apps/portal/src/app/api/` |
| MCP adapter (Streamable HTTP) | `apps/portal/src/app/api/mcp/` |
| Database schema (PostgreSQL `registry`) | `packages/core/prisma/schema.prisma` |
| Seed data (reference taxonomies + exemplar provider) | `packages/core/prisma/seed.ts` |
| Deployment configuration | `packages/core` config layer + `.env` (values) |
| Prisma client singleton | `packages/core` |

## Roadmap

Phased delivery is tracked in [`../ai-registry-specs/.speckit/implementation_plan.md`](../ai-registry-specs/.speckit/implementation_plan.md):

- **Phase 1 - Foundations and data model.** _In progress / mostly complete._ The Prisma schema, the config layer, the seed script, and `docker-compose.yml` constitute the Phase 1 deliverables.
- **Phase 2 - Authentication and provider identity.** OIDC/OAuth-class sign-in; provider/admin/verifier/sovereign role separation; session linkage to `provider_id`.
- **Phase 3 - Public discovery (portal + REST).** REST list/detail/resolve/discover, `.well-known`, full localisation.
- **Phase 4 - Provider submission and governance workflows.** _Delivered (May 2026)._ Draft → submit pipeline gated by `canAuthorResources`, §11 reviewer checklist, lifecycle transitions, provider verification (`/api/admin/providers/{id}/verify`, T035), official-resource elevation (`/api/admin/resources/{id}/elevate`, T036), and audit instrumentation across every governance mutation.
- **Phase 5 - Adapters, conformance, hardening.** _Delivered (May 2026)._ Health probe (`/api/health`), MCP Streamable HTTP at `/api/mcp` exposing `registry.list / get / resolve / discover / well_known`, OpenAPI 3.0 document at `/api/openapi`, hardened validators, and the smoke runner via `pnpm smoke`.

## Repository conventions

Contributions are welcome from telcos, government digital agencies, sovereign cloud operators, public-interest technology organisations, and individual developers. Follow [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`GOVERNANCE.md`](GOVERNANCE.md); changes that breach the registry-only boundary in `GOVERNANCE.md` will not be accepted.

- Open-source license: Apache-2.0 (see [`LICENSE`](LICENSE)).
- Contribution process and conduct: [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Security disclosure: [`SECURITY.md`](SECURITY.md).
- Governance and explicitly-out-of-scope list: [`GOVERNANCE.md`](GOVERNANCE.md).
- Installation walkthrough: [`INSTALL.md`](INSTALL.md).
- Data model reference: [`data-model.md`](data-model.md). Authoritative schema is [`packages/core/prisma/schema.prisma`](packages/core/prisma/schema.prisma).
- Per-package READMEs: [`packages/core/README.md`](packages/core/README.md), [`packages/sdk/README.md`](packages/sdk/README.md), [`packages/ui-kit/README.md`](packages/ui-kit/README.md), [`apps/portal/README.md`](apps/portal/README.md).
- Specs are normative and live under [`../ai-registry-specs/`](../ai-registry-specs/).
- Design source-of-truth is the Claude prototype at [`../ai-registry-prototype/claudedesign/`](../ai-registry-prototype/claudedesign/) (see `ai-registry-specs/.speckit/design.md`).

## Migrating from the pre-monorepo layout?

See [`MIGRATION.md`](MIGRATION.md) for path mapping, the `@/lib/...` alias bridge, and deploy-script updates. For the component-library migration handoff, see [`docs/library-migration.md`](docs/library-migration.md).

## What is _not_ in the monorepo yet

- Full MCP/cron/schema extension wiring for plugins (REST + a minimal UI slot ship today).
- Full design-token set in `@airegistry/ui-kit`.
- `/admin/plugins` operator UI for extension lifecycle.

See [`docs/open-source/migration-plan.md`](docs/open-source/migration-plan.md) for the v1.0 roadmap.

## Acknowledgements

AI Registry was spearheaded by Mauritius Telecom. The reference deployment at [airegistry.mu](https://www.airegistry.mu) is operated by Mauritius Telecom as the first reference operator; other jurisdictions can deploy this codebase with their own environment configuration.

## License

Apache License 2.0 - see [`LICENSE`](LICENSE).
