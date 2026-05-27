# @airegistry/plugin-host

Loads in-tree extensions from `extensions/**/airegistry-plugin.json` and wires:

- REST handlers at `/api/ext/<plugin-id>/...` (via `apps/portal` catch-all route)
- UI slot components for `<PluginSlot id="..." />`

Extensions import only `@airegistry/sdk`; this package is the bridge used by the reference portal.

## Enable or disable

Plugins load **by default** when `PLUGINS_ENABLED` is unset. Set `PLUGINS_ENABLED=false` in the root `.env` to disable all extensions (including the hello demo on the home page).

Operator steps and slot IDs: [`CUSTOMIZATION.md`](../../CUSTOMIZATION.md) (Layer 4 — Extensions).

## Example

See [`extensions/examples/hello`](../../extensions/examples/hello/).
