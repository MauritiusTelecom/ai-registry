# airegistry-specs

Normative and cross-cutting specifications for the **AI Registry** programme. AIR-SPEC 0.4 and stakeholder narratives are folded into [`.speckit/specification.md`](.speckit/specification.md); architecture principles live in [`.speckit/constitution.md`](.speckit/constitution.md); phased delivery in [`.speckit/implementation_plan.md`](.speckit/implementation_plan.md); task breakdown in [`.speckit/tasks.md`](.speckit/tasks.md); entity and relationship reference in [`data-model.md`](data-model.md).

## Repository layout

| Path | Role |
|------|------|
| [`ai-registry`](../ai-registry/) | **Registry** — Next.js app: public portal, provider/admin workspaces, PostgreSQL schema `registry`, REST under `/api/`, MCP Streamable HTTP at `/api/mcp`. Authoritative operating detail: [`ai-registry/specs.md`](../ai-registry/specs.md). Quick start: [`ai-registry/README.md`](../ai-registry/README.md). |
| **airegistry-specs** (this folder) | Spec kit + data model that tracks AIR-SPEC and maps to the reference app. |

## Data model

This repo also carries the registry schema reference in [`data-model.md`](data-model.md), aligned with the authoritative Prisma DDL used by [`ai-registry`](../ai-registry/) at `ai-registry/src/prisma/schema.prisma`.

## API path note

AIR-SPEC describes a versioned public base (e.g. `/api/v1/...`). The **current** `ai-registry` reference implements discovery REST at **`/api/...`** (no `v1` segment). See [`.speckit/specification.md`](.speckit/specification.md) §13 for both the normative AIR-SPEC shape and the implemented surface. A reverse proxy may expose `/api/v1` as an alias.

## Powered by

Public UI copy for national deployments should follow product rules (e.g. footer via `siteConfig.footerPoweredBy` in consumer apps where applicable).
