# @airegistry/sdk

Public SDK for AI Registry **extensions** and **third-party portals**.

Anything exported from [`src/index.ts`](src/index.ts) is part of the SDK's SemVer contract: breaking changes require a major bump and a deprecation window. Deep imports into `@airegistry/core` are **not** stable and may change in any release.

## What you get

- Read-only access to the deployment `RegistryConfig`.
- AIR-ID parsing and URL/slug validators.
- The plugin manifest types (`PluginManifest`, `PluginRestRoute`, …).

## What you do NOT get

- Direct database access. Use the REST API at `/api/...` or, from inside the same Node process, request a scoped Prisma client through the (forthcoming) plugin runtime.
- The audit primitive directly — governance writes must flow through core's audit-aware service helpers, which call `writeAudit()` for you.

See [`packages/sdk/src/plugin.ts`](src/plugin.ts) for the plugin manifest shape and the scope rules a loaded plugin must obey.
