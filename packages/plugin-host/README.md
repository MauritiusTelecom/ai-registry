# @airegistry/plugin-host

Loads in-tree extensions from `extensions/**/airegistry-plugin.json` and wires:

- REST handlers at `/api/ext/<plugin-id>/...` (via `apps/portal` catch-all route)
- UI slot components for `<PluginSlot id="..." />`

Extensions import only `@airegistry/sdk`; this package is the bridge used by the reference portal.

## Disable extensions

```bash
PLUGINS_ENABLED=false
```

When unset, plugins load by default.

## Example

See [`extensions/examples/hello`](../../extensions/examples/hello/).
