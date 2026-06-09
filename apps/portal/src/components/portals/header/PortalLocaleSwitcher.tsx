"use client";

import { LocaleSwitcherControl } from "@airegistry/public/shell/LocaleSwitcherControl";

/**
 * Language control for workspace portals — same behaviour as public TopNav.
 */
export function PortalLocaleSwitcher() {
  return <LocaleSwitcherControl variant="portal" />;
}
