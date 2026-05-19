# @airegistry/portal

The default Next.js portal for the AI Registry reference implementation: public site, admin / provider / verifier / sovereign workspaces, REST API under `/api/...`, MCP Streamable HTTP adapter at `/api/mcp`.

This app depends on:

- `@airegistry/core` — Prisma schema, governance services, audit primitive, validators, transactional email.
- `@airegistry/ui-kit` — design tokens and headless components.
- `@airegistry/sdk` — types shared with extensions.

## Customisation tiers

1. **Configuration + branding.** No code: set the deployment `.env` and edit `SiteBranding` via `/admin/branding`.
2. **Theming.** Override CSS variables from `@airegistry/ui-kit/tokens.css` in a deployment stylesheet loaded after the kit's tokens.
3. **Slot overrides.** Drop an extension that contributes to `<PluginSlot id="...">` slots in the portal.
4. **Fork.** Take the portal as your starting point; continue to depend on `@airegistry/core` for upgrades.

## Path-alias bridge

During the monorepo migration, historical `@/lib/<core-module>` imports are aliased through [`tsconfig.json`](tsconfig.json) to `../../packages/core/src/lib/...`. New code should prefer `import { ... } from "@airegistry/core"` (or a curated subpath such as `@airegistry/core/governance`). The bridge will be removed after the migration period — see [`MIGRATION.md`](../../MIGRATION.md).
