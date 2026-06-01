# Governance

This document describes how the **`ai-registry`** reference implementation is governed: who maintains it, how decisions are made, what is in scope, and - critically - what is **explicitly out of scope** so that contributors can spot scope creep early.

It is grounded in [AIR-SPEC 0.4 §3 and §16](../ai-registry-specs/.speckit/specification.md) and the [constitution](../ai-registry-specs/.speckit/constitution.md). Where this document and the constitution disagree, the constitution wins.

## 1. Mission

The AI Registry is a **discovery and governance metadata layer**:

> The registry points. The provider operates. The hosting environment secures.

A small, credible catalogue is preferable to a large generic one. Every architectural and product decision in this repository must serve discovery, sovereignty review, and audit transparency - not hosting, not enforcement, not commerce.

## 2. Scope

**In scope** for this codebase:

- Listing AI resources (models, agents, tools, skills) with stable AIR-IDs under `air://`.
- Capturing sovereignty bases and evidence per the AIR-SPEC vocabulary.
- Three independent governance signals: provider verification, sovereignty review, official-resource authorisation.
- An append-only audit trail of governance-relevant actions.
- Public REST discovery (list / detail / resolve / discover / `.well-known`).
- Optional protocol adapters (MCP, future) that are **views** over the same data.
- Localisation (`Accept-Language` resolution, `name_localized`, `description_localized`).
- Federation **schema fields** reserved (`origin_registry`, `source_air_id`); no MVP federation worker.

## 3. Explicitly out of scope

The following are **permanently out of scope** for AIR-Core. Pull requests, RFCs, or features in any of these categories MUST be rejected:

| # | Out of scope | Why |
|---|---|---|
| 1 | Hosting AI workloads or model inference | Providers (or their hosting partners) host. The registry is metadata only. |
| 2 | Acting as a runtime gateway, proxy, or rate limiter for provider APIs | Mediating runtime traffic would conflate discovery with operation. |
| 3 | Issuing runtime credentials (SPIFFE/SPIRE operation, SVIDs, OAuth bearer tokens for resource access) | AIR-IDs name what is **listed**; `spiffe://` (and similar) names what **runs**. |
| 4 | Billing, payments, transaction settlement, or marketplace transactions | Commercial relationships live between consumer and provider. |
| 5 | Mandatory universal legal certification or warranty for listed resources | Listing is not endorsement; the registry must remain a metadata layer. |
| 6 | Acting as arbiter of provider liability | The provider is liable; the registry records governance metadata. |
| 7 | A2A adapter, federation sync workers, automated TAIP posture trees | Not part of the MVP scope; reserved for explicit later RFC. |

When reviewing a contribution, maintainers must ask: *Does this change move us closer to "the registry points," or closer to one of the seven items above?* If the latter - even when packaged as a "small helpful enhancement" - the change must be refused.

## 4. Roles

- **Maintainers** - merge PRs, cut releases, and own the `main` branch. Listed in `MAINTAINERS.md` (file to be added when the maintainer set stabilises beyond the founding contributors).
- **Reviewers** - code review for any non-trivial PR. Maintainers may also act as reviewers.
- **Contributors** - anyone opening a PR or issue per [`CONTRIBUTING.md`](CONTRIBUTING.md).

## 5. Decision process

| Decision class | Process |
|---|---|
| Routine code change (bug fix, minor refactor, doc edit) | One reviewer approval; maintainer merges. |
| Schema change to `packages/core/prisma/schema.prisma` | Two reviewer approvals (one of whom must be a maintainer). PR description must include the AIR-SPEC clause(s) the change traces to and an entry in `data-model.md`. |
| New public REST endpoint | Update the relevant module's `api.yaml` first in `ai-registry-specs/`; reference the spec PR from the implementation PR. |
| Feature touching a governance signal (provider verification, sovereignty review, official-resource authorisation) | Open an RFC issue; mandatory maintainer + at least one external reviewer. The §11 reviewer checklist must be re-validated. |
| Anything intersecting §3 (out of scope) | **Refuse.** Document the refusal in the issue/PR for future contributors. |
| AIR-SPEC conformance break | Refuse unless the constitution and `ai-registry-specs/.speckit/specification.md` are updated in lockstep with reasoned justification. |

## 6. Conformance

The `ai-registry` reference implementation tracks AIR-SPEC 0.4. The §22 conformance checklist lives in `ai-registry-specs/` and is validated in CI as part of Phase 5 (T102). Any merge that breaks conformance must restore it within the same PR series - `main` should always be conformant.

## 7. Versioning

- The AIR-SPEC version this codebase implements is declared in [`README.md`](README.md) and the `package.json` `version` reflects the registry **release**, not the AIR-SPEC version.
- Breaking schema changes require a migration in `packages/core/prisma/migrations/`. Drop-and-recreate migrations are NOT acceptable on `main`; production deployments rely on `prisma migrate deploy` against a non-empty database.
- Each workspace package (`@airegistry/core`, `@airegistry/sdk`, `@airegistry/ui-kit`, `@airegistry/portal`) carries its own `package.json` `version`. Core and SDK versions are the public SemVer surface for downstream consumers and may only break on a major bump.

## 8. Security

Vulnerability disclosure follows [`SECURITY.md`](SECURITY.md). Embargoed fixes may bypass the normal review process at maintainer discretion; a public retrospective is published after disclosure.

## 9. Audit

Every governance mutation in code MUST go through the `writeAudit()` primitive (Phase 4 - T037). The audit table is append-only with retention of at least 24 months per AIR-SPEC §18. Any code change that bypasses `writeAudit()` for a governance write MUST be rejected.

## 10. Changes to this document

Changes to this `GOVERNANCE.md` require maintainer consensus and a 7-day comment window on the PR. The constitution at `../ai-registry-specs/.speckit/constitution.md` is the parent authority - this document refines it for the reference codebase but cannot override it.

## 11. Per-package scope

The monorepo is split so the stable parts (core, SDK) can hold a SemVer contract while the variable parts (portal, extensions) can move quickly. Maintainers reject PRs that put code in the wrong package.

| Package | Scope (what belongs here) | Anti-scope (what doesn't) |
|---|---|---|
| `packages/core` (`@airegistry/core`) | Prisma schema + migrations, deployment config loader, `writeAudit()` primitive, governance services (provider verification, sovereignty review, official-resource elevation), discovery query helpers, validators (AIR-ID, URL, slug), transactional email sender, session/password/token helpers | React components, Next.js route handlers, CSS, branding mutators, jurisdiction-specific defaults, any feature in §3 |
| `packages/sdk` (`@airegistry/sdk`) | Curated re-exports of core types intended for extensions and third-party portals; plugin manifest schema | Implementation code, deep core internals, anything that isn't part of the public SemVer surface |
| `packages/ui-kit` (`@airegistry/ui-kit`) | Design tokens, headless React primitives (client-safe barrel) | Branding singletons, data fetching, plugin loaders, anything portal-route-specific |
| `packages/public` (`@airegistry/public`) | Public marketing site: pages, sections, shell, auth-ui, public-only helpers; CMS-backed sections | API route handlers, role workspaces, Prisma schema |
| `packages/plugin-host` (`@airegistry/plugin-host`) | Extension manifest loader, `/api/ext/*` dispatch, in-memory UI slot registry | Core schema, governance services, public page copy |
| `apps/portal` (`@airegistry/portal`) | Next.js routes: `app/(public)/` shims, `app/(workspaces)/` role portals, REST `/api/...` and MCP `/api/mcp` handlers (thin shims over core services) | Prisma schema, audit primitive, governance services, public page bodies (those live in `@airegistry/public`) |
| `extensions/*` | In-tree reference extensions following the `airegistry-plugin.json` manifest from `@airegistry/sdk/plugin`. New REST routes under `/api/ext/<id>/`, MCP tools under `ext.<id>.*`, additive schema in an `ext_<id>` Postgres schema, cron jobs, UI slot contributions, locale bundles. | The core `registry` schema, the core `/api/...` or `registry.*` MCP namespaces, direct writes to `AuditLog`, and anything in §3 |

The portal owns the **default UI** for the reference deployment. It is fork-friendly but third-party portals are first-class: anyone may depend on `@airegistry/core` and ship their own UI without using `@airegistry/portal` at all.

## 12. Plugin / extension governance

Plugins are a third party's code running inside the registry process. Because of that, the plugin loader enforces (or will enforce, at v1.0):

- **Namespacing.** REST routes mount under `/api/ext/<plugin-id>/`; MCP tools mount under `ext.<plugin-id>.*`. The plugin cannot claim a core path.
- **Schema isolation.** Plugin migrations land in `ext_<plugin-id>` PostgreSQL schemas, never `registry`. The plugin's Prisma client (if any) has no read or write access to `registry` tables except through core SDK helpers.
- **Audit discipline.** Governance writes flow through audit-aware core service helpers that call `writeAudit()` internally. Plugins cannot write to `AuditLog` directly; PRs that do are rejected.
- **§3 still applies.** A plugin cannot do anything that core itself isn't allowed to do. The seven items in §3 are universal — they bind plugins as tightly as they bind core.

The plugin manifest types are in [`packages/sdk/src/plugin.ts`](packages/sdk/src/plugin.ts). The reference loader is [`packages/plugin-host`](packages/plugin-host/); MCP tools, cron, and `ext_<id>` schema lifecycle remain v1.0 work. Disable extensions with `PLUGINS_ENABLED=false`.
