# @airegistry/core

Core of the AI Registry reference implementation: the Prisma schema, the deployment configuration loader, the audit primitive, governance services, discovery query helpers, validators, and transactional email.

This package is consumed by:

- `@airegistry/portal` — the default Next.js UI shipped under `apps/portal`.
- Any third-party portal or extension that wants to talk to the registry data model.

## Public surface

The public, semver-tracked exports live in [`src/index.ts`](src/index.ts). Anything imported from a deep path (`@airegistry/core/lib/...`) is **not** covered by the SemVer contract — convert it to a barrel export when you want it to be stable.

## Prisma

The schema lives at [`prisma/schema.prisma`](prisma/schema.prisma). The generator output is written to `src/generated/prisma/` and re-exported via `@airegistry/core/prisma`.

Common commands (run from the monorepo root via Turborepo, or from this package):

```
pnpm --filter @airegistry/core prisma:generate
pnpm --filter @airegistry/core prisma:migrate
pnpm --filter @airegistry/core db:seed
```

## What does NOT belong here

- React components, Next.js route handlers, Tailwind/CSS, branding singletons — those live in `apps/portal`.
- Federation workers, billing, sector-specific dashboards — those belong in `extensions/*`.
- Anything in [`GOVERNANCE.md` §3](../../GOVERNANCE.md) — out of scope for the whole project.
