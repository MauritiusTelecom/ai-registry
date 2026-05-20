# AI Registry

**Open-source infrastructure for sovereign AI discovery.**

AI Registry is an open specification and a generic open-source platform that any country, city, telco or trusted public digital infrastructure operator can deploy to create a sovereign registry of locally relevant AI resources. It lists, identifies, describes and helps discover those resources. It does not host, execute, authorise or intermediate them.

The reference implementation tracks [AIR-SPEC 0.4](../ai-registry-specs/.speckit/specification.md) as a **pnpm + Turborepo monorepo**: a stable `@airegistry/core`, a forkable `@airegistry/portal`, and forthcoming extension surfaces via `@airegistry/sdk`.

The reference deployment is [airegistry.mu](https://www.airegistry.mu), operated by Mauritius Telecom.

> **Listing ≠ endorsement.** The registry points; the provider operates; the hosting environment secures.

## What this is

A national or municipal AI Registry tells people, developers and AI systems what sovereign AI resources exist, who provides them, why they are locally relevant, and where to find them. It exposes structured metadata and stable identifiers, but does not sit on the runtime path between consumer and provider.

Three resource types are covered: **models** (trained or tuned with local data, language or purpose), **agents** (AI systems that perform tasks in a local context) and **skills** (packaged local expertise that AI systems can load and use). Each must meet a published sovereignty test against local law, data, systems or language and culture.

## Monorepo layout

| Path | Package | Role |
|---|---|---|
| `packages/core/` | `@airegistry/core` | Prisma schema + migrations, deployment config, governance services, audit primitive, discovery queries, validators, transactional email. SemVer contract for downstream consumers. |
| `packages/sdk/` | `@airegistry/sdk` | Public types and plugin manifest schema for extensions and third-party portals. |
| `packages/ui-kit/` | `@airegistry/ui-kit` | Design tokens and shared headless components (`Icon`, `PageHero`, `AuthProvider`, `ThemeProvider`, `LogoutButton`) used by both the public site and the role workspaces. |
| `packages/public/` | `@airegistry/public` | Public-portal layer: marketing pages, registry browse + discovery surface, governance/docs/ecosystem pages, auth flows, site shell. Forkable independently of the role workspaces. |
| `apps/portal/` | `@airegistry/portal` | Default Next.js app. Mounts `@airegistry/public` at the public route group and serves the admin/provider/verifier/sovereign workspaces plus REST `/api/...` and MCP `/api/mcp`. Forkable; theme via CSS variables. |
| `extensions/` | — | In-tree reference extensions (none yet). Third-party extensions install as workspace or npm packages following the manifest in `@airegistry/sdk/plugin`. |
| `ai-registry-specs/` (sibling repo) | — | Normative AIR-SPEC + module specs. |

## Status

This repository is at **v0.4 (working draft)**. The specification is stable enough to deploy a reference implementation and stress-test it with partners, but is expected to evolve through v0.5 (partner feedback) to v1.0 (public launch). Expect breaking changes during this phase.

## Documentation

The illustrated whitepaper is the canonical introduction: what the registry is, why it matters, how it works, and what is in and out of scope.

- [`docs/AI_Registry_Whitepaper_Illustrated_v0.4.docx`](docs/AI_Registry_Whitepaper_Illustrated_v0.4.docx)

Other artefacts (concept whitepaper, technical specification, presentation deck, prior versions) live alongside it in `docs/` and `docs/archive/`.

## Architecture in one line

```
air://{identity_domain}/{resource_type}/{provider_slug}/{resource_slug}
```

For example: `air://air.mu/skill/gov/mra-tax-calculator`. The `air://` URI scheme is dedicated to registry identifiers and is intentionally separate from SPIFFE's `spiffe://`, which remains reserved for runtime workload identity.

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
3. **Extensions / fork.** Drop a plugin under `extensions/` (manifest shape in `@airegistry/sdk/plugin`) for new REST routes, MCP tools, scheduled jobs, UI slots, or locale bundles. For deep redesigns, fork `apps/portal` and continue to depend on `@airegistry/core`.

## What is in scope

Public resource directory and search; resource detail pages; provider onboarding and submission workflow; admin review workflow; sovereignty review process; REST discovery API; configurable jurisdiction; AIR-ID issuance; localisation; audit logging.

## What is out of scope

Hosting AI resources; runtime execution; AI Gateway or Agent Gateway; access control for third-party resources; marketplace, billing or commercial transactions; registry-operated SPIRE or runtime SVID issuance; legal certification or provider liability management. The registry-only boundary is part of the product — see [`GOVERNANCE.md`](GOVERNANCE.md) §3.

## Contributing

Contributions are welcome from telcos, government digital agencies, sovereign cloud operators, public-interest technology foundations, regional standards bodies, and individual developers. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contribution process and [`GOVERNANCE.md`](GOVERNANCE.md) for the working-group structure.

## Migrating from the pre-monorepo layout?

See [`MIGRATION.md`](MIGRATION.md) for path mapping, the `@/lib/...` alias bridge, and deploy-script updates. For the component-library migration handoff, see [`docs/library-migration.md`](docs/library-migration.md).

## Licence and links

- License: Apache-2.0 (see [`LICENSE`](LICENSE)).
- Installation walkthrough: [`INSTALL.md`](INSTALL.md).
- Security disclosure: [`SECURITY.md`](SECURITY.md).
- Data model reference: [`data-model.md`](data-model.md). Authoritative schema is [`packages/core/prisma/schema.prisma`](packages/core/prisma/schema.prisma).
- Per-package READMEs: [`packages/core/README.md`](packages/core/README.md), [`packages/sdk/README.md`](packages/sdk/README.md), [`packages/ui-kit/README.md`](packages/ui-kit/README.md), [`apps/portal/README.md`](apps/portal/README.md).
- Specs are normative and live in [`../ai-registry-specs/`](../ai-registry-specs/).

## What is _not_ in the monorepo yet

- Plugin loader runtime (only the manifest types are scaffolded in `@airegistry/sdk`).
- `<PluginSlot>` primitive in the portal.
- Full design-token set in `@airegistry/ui-kit`.

These land in v1.0 — see the roadmap in the open-source rollout plan.

## Acknowledgements

AI Registry was spearheaded by Mauritius Telecom and is being shaped together with peers across the digital public infrastructure community. The list of co-creating organisations will grow as the working group forms.
