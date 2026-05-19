# @airegistry/ui-kit

Design tokens and headless React primitives for AI Registry portals.

The default portal (`apps/portal`) imports `@airegistry/ui-kit/tokens.css` once at the root layout. Operators that want to theme without forking the portal override the CSS variables in their own stylesheet, loaded after the kit's tokens.

This package is a stub today: the full token set, headless components, and the `<PluginSlot id="...">` primitive that extensions use to mount UI will land here once the prototype design system is canonicalised.
