# Hello example extension

Reference plugin for AI Registry operators and extension authors.

## Manifest

[`airegistry-plugin.json`](./airegistry-plugin.json) validates against `@airegistry/sdk/plugin`.

## What it demonstrates

- **REST:** `GET /api/ext/hello/ping` returns a JSON greeting.
- **UI slot:** `public.home.hero.below` on the public home page (below the hero).

## Enable locally

From the monorepo root (default: plugins enabled unless explicitly disabled):

```bash
# optional — plugins are on by default
export PLUGINS_ENABLED=true

pnpm dev
```

Visit `/` to see the slot banner and `/api/ext/hello/ping` for the REST handler.

## Fork pattern

Copy this folder to `extensions/<your-id>/`, update `id` in the manifest and `package.json` `name`, then add handlers and slot components. Do not modify `packages/core`.
