# ai-registry

**Reference implementation** of the [AIR-SPEC 0.4](../ai-registry-specs/.speckit/specification.md) Mauritius AI Registry - a Next.js public portal, Provider/Admin/Verifier/Sovereign workspaces, and the PostgreSQL `registry` schema. Discovery is exposed via REST under `/api/...`, plus an MCP Streamable HTTP adapter at `/api/mcp` (Phase 5).

The reference deployment is `airegistry.mu` (Mauritius Telecom as first reference operator). The codebase carries **no jurisdiction-specific defaults** - every deployment supplies its own `registry_name`, `jurisdiction`, `identity_domain`, `operator_name`, `default_language`, and resource-type set via configuration.

> **Listing ≠ endorsement.** The registry points; the provider operates; the hosting environment secures. Public surfaces reflect this separation in copy, status labels, and footer disclaimer.

## What this is

An AI Registry is a jurisdiction-configured catalogue: it **lists, identifies, describes, and helps discover** AI resources that are locally relevant (for example models, agents, tools, and skills), with structured metadata and stable identifiers. It does **not** host workloads, run inference, authorize access to third-party provider APIs, or sit on the runtime path between consumers and providers.

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

## Getting started

Installation, configuration, scripts, and deployment/operations notes live in [`INSTALLATION.md`](INSTALLATION.md). At a glance:

```bash
npm install
cp .env.example .env             # fill in DATABASE_URL + deployment config
npm run prisma:generate && npm run db:push && npm run db:seed
npm run dev                      # http://localhost:3002
```

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

- **Phase 1 - Foundations and data model.** _In progress / mostly complete._ The Prisma schema, the config layer, the seed script, and `docker-compose.yml` constitute the Phase 1 deliverables.
- **Phase 2 - Authentication and provider identity.** OIDC/OAuth-class sign-in; provider/admin/verifier/sovereign role separation; session linkage to `provider_id`.
- **Phase 3 - Public discovery (portal + REST).** REST list/detail/resolve/discover, `.well-known`, full localisation.
- **Phase 4 - Provider submission and governance workflows.** _Delivered (May 2026)._ Draft → submit pipeline gated by `canAuthorResources`, §11 reviewer checklist, lifecycle transitions, provider verification (`/api/admin/providers/{id}/verify`, T035), official-resource elevation (`/api/admin/resources/{id}/elevate`, T036), and audit instrumentation across every governance mutation.
- **Phase 5 - Adapters, conformance, hardening.** _Delivered (May 2026)._ Health probe (`/api/health`), MCP Streamable HTTP at `/api/mcp` exposing `registry.list / get / resolve / discover / well_known`, OpenAPI 3.0 document at `/api/openapi`, hardened validators in `src/lib/validators.ts`, and the smoke runner via `npm run smoke`.

## Repository conventions

Contributions are welcome from telcos, government digital agencies, sovereign cloud operators, public-interest technology organisations, and individual developers. Follow [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`GOVERNANCE.md`](GOVERNANCE.md); changes that breach the registry-only boundary in `GOVERNANCE.md` will not be accepted.

- Open-source license: Apache-2.0 (see [`LICENSE`](LICENSE)).
- Contribution process and conduct: [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Security disclosure: [`SECURITY.md`](SECURITY.md).
- Governance and explicitly-out-of-scope list: [`GOVERNANCE.md`](GOVERNANCE.md).
- Installation, configuration, and operations: [`INSTALLATION.md`](INSTALLATION.md).
- Specs are normative and live under [`../ai-registry-specs/`](../ai-registry-specs/).
- Design source-of-truth is the Claude prototype at [`../ai-registry-prototype/claudedesign/`](../ai-registry-prototype/claudedesign/) (the local copy carries the latest fixes; see `ai-registry-specs/.speckit/design.md`).

## Acknowledgements

AI Registry was spearheaded by Mauritius Telecom. The reference deployment at [airegistry.mu](https://www.airegistry.mu) is operated by Mauritius Telecom as the first reference operator; other jurisdictions can deploy this codebase with their own environment configuration.

## License

Apache License 2.0 - see [`LICENSE`](LICENSE).
