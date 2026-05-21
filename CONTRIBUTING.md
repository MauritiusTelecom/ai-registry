# Contributing to ai-registry

Thanks for your interest. The reference implementation tracks [AIR-SPEC 0.4](../ai-registry-specs/.speckit/specification.md) and the [constitution](../ai-registry-specs/.speckit/constitution.md). This guide describes how to set up a local environment, the contribution flow, the per-package scope rules, and the small set of conventions that keep the codebase consistent across portals.

## Local setup

See [`INSTALL.md`](INSTALL.md) for the full walkthrough. Short version:

```bash
pnpm install
cp .env.example .env       # then edit DATABASE_URL + deployment config
docker compose up -d postgres
pnpm prisma:generate
pnpm db:push
# set SEED_ADMIN_PASSWORD (and optional SEED_ADMIN_EMAIL) in .env, then:
pnpm db:seed
pnpm --filter @airegistry/portal dev    # http://localhost:3002 — sign in at /login
```

Bootstrap admin login (`SEED_ADMIN_*`): see [`INSTALL.md`](INSTALL.md) §5.

If your edits touch the schema, run `pnpm prisma:format && pnpm prisma:validate` before opening a PR.

## Repository layout

Before working on a change, know which package owns the code you'll touch:

| Package | What lives here | What does NOT live here |
|---|---|---|
| `packages/core` (`@airegistry/core`) | Prisma schema + migrations, deployment config loader, audit primitive, governance services, discovery queries, validators, transactional email, auth session/password/token helpers | React components, Next.js routes, CSS, branding mutators, jurisdiction-specific defaults |
| `packages/sdk` (`@airegistry/sdk`) | Curated re-exports of core types, plugin manifest types | Implementation code, business logic |
| `packages/ui-kit` (`@airegistry/ui-kit`) | Design tokens, headless React primitives, the `<PluginSlot>` system (planned) | Branding singletons, data fetching, anything portal-specific |
| `apps/portal` (`@airegistry/portal`) | Next.js routes (public + admin + provider + verifier + sovereign), components, branding, theme cookie, public-origin helper | Prisma schema, audit primitive, anything that should be reusable by third-party portals |
| `extensions/*` | In-tree reference extensions following the plugin manifest in `@airegistry/sdk/plugin` | Anything that mutates the `registry` schema (extensions get `ext_<id>` schemas), anything in [`GOVERNANCE.md`](GOVERNANCE.md) §3 |

If your change crosses a boundary (e.g. a portal route needs a new core service), submit the core change first, get it merged, then send the portal change against the new core export. Direct edits to `apps/portal/src/lib/...` that duplicate logic which belongs in core will be sent back.

## Contribution flow

1. **Open an issue first** for non-trivial changes. The issue is the place to align on scope before code is written. Issues that touch [`GOVERNANCE.md`](GOVERNANCE.md) §3 ("explicitly out of scope") will be closed.
2. **Branch from `main`.** Use a short kebab-case branch name (e.g. `phase-1/seed-script`, `phase-3/resolve-endpoint`).
3. **Make focused commits.** One commit per logical change; the commit subject should be a sentence in imperative form ("Add config validation for SUPPORTED_LANGUAGES").
4. **Open a PR** with the change description, the AIR-SPEC clause(s) the change traces to (where applicable), the affected package(s) listed in the title or body, and a checklist confirming:
   - `pnpm lint` passes;
   - `pnpm typecheck` passes;
   - `pnpm prisma:validate` passes (if schema touched);
   - `pnpm config:validate` passes (if `.env.example` or `packages/core/src/lib/config.ts` touched);
   - `pnpm db:seed` runs to completion against a fresh database (if `packages/core/prisma/seed.ts` touched);
   - For portal-only changes: `pnpm --filter @airegistry/portal build` succeeds;
   - For core changes: `pnpm --filter @airegistry/core typecheck` succeeds.
5. **Reviewers** — at least one approval for routine changes; two for schema changes (one of whom must be a maintainer). See [`GOVERNANCE.md`](GOVERNANCE.md) §5 for the full matrix.

## Code conventions

- **No jurisdiction hardcoding.** Anything that varies by deployment (`registry_name`, `jurisdiction`, `identity_domain`, language list, …) must come from `@airegistry/core` (via `getConfig()`) or the `SiteBranding` singleton, never from a literal in code. CI enforces this for known deployment-specific tokens.
- **Audit primitive.** Every governance mutation goes through `writeAudit()` in `packages/core/src/lib/audit/write-audit.ts`. Direct writes to `AuditLog` are rejected in review.
- **Listing ≠ endorsement.** Public-facing copy must distinguish provider-declared, sovereignty-reviewed, and official-resource states. Don't blur the labels.
- **TypeScript strict mode is on** in every package. `tsconfig.base.json` sets `"strict": true`; `any` is allowed only with a justification comment.
- **No new gradients or hex literals in the public UI.** Use the design tokens from `@airegistry/ui-kit/tokens.css` (and the prototype). See `ai-registry-specs/.speckit/design.md` §3.
- **Prisma reference tables.** Controlled vocabularies are tables (id / code / name / description / active / sortOrder), not Postgres enums — see `packages/core/prisma/schema.prisma` headers.
- **Imports across packages.** Prefer the public package surface: `import { ... } from "@airegistry/core"` (or a curated subpath such as `@airegistry/core/governance`). Deep imports into another package's `src/` are not stable.

### The `@/lib/...` path-alias bridge (transitional)

During the monorepo migration, ~170 source files in `apps/portal/` import core modules via the historical `@/lib/...` alias. The portal's `apps/portal/tsconfig.json` maps those paths through to `../../packages/core/src/lib/...` so they keep resolving without edits. **New code should not add to the bridge** — import directly from `@airegistry/core` instead:

```ts
// ❌ Old style (do not use in new code)
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

// ✅ Preferred
import { prisma } from "@airegistry/core";
import { writeAudit } from "@airegistry/core/audit";
```

The bridge will be removed after a deprecation window. PRs that convert a batch of legacy imports to the public package surface are welcome and small enough to review independently.

## Spec changes

If a contribution requires an AIR-SPEC or module spec change, open the spec PR in [`../ai-registry-specs/`](../ai-registry-specs/) **first**, then reference it from the code PR. The reverse order — implementation drives spec — is acceptable only when fixing a clearly-stated bug in the spec.

## Plugin / extension contributions

Plugins live in `extensions/<id>/` (in-tree references) or as standalone npm packages. Every plugin ships an `airegistry-plugin.json` manifest validated against the types in `@airegistry/sdk/plugin`. Hard rules for plugin PRs (mirror of [`GOVERNANCE.md`](GOVERNANCE.md) §3):

- REST routes namespace under `/api/ext/<plugin-id>/...`; the core `/api/...` surface is off-limits.
- MCP tools namespace under `ext.<plugin-id>.*`; the core `registry.*` tools are off-limits.
- Schema additions live in `ext_<plugin-id>` PostgreSQL schemas; the core `registry` schema is never mutated by a plugin.
- Governance writes go through the core audit-aware service helpers; plugins cannot write to `AuditLog` directly.

The plugin loader runtime is on the v1.0 roadmap; manifest contributions are accepted now and will be wired up at v1.0.

## Tests

- Unit tests sit next to the file they cover (`foo.test.ts` next to `foo.ts`).
- Integration tests for routes / API live under `apps/portal/src/app/__tests__/`.
- E2E tests (when introduced in Phase 5 / T055) will live under `e2e/` at the repo root.
- The current test runner is Vitest (configured in Phase 5 — until then, `pnpm lint`, `pnpm typecheck`, and `pnpm prisma:validate` are the gating checks).

## Code of conduct

We expect contributors to be respectful, patient, and mindful of the global, cross-jurisdiction nature of this project. Conduct that contradicts those values may result in PR closure or contributor blocks at maintainer discretion. A formal Contributor Covenant `CODE_OF_CONDUCT.md` will be added before the first public stable release.

## License

By contributing, you agree your contributions are licensed under the project's [Apache 2.0 license](LICENSE).
