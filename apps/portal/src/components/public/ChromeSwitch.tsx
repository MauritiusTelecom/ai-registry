"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isPortalPath } from "@/lib/portals/path";

/**
 * Client-side chrome switch. Portal layouts (/admin, /provider, /verifier,
 * /sovereign, /portal) render their own sidebar + header - wrapping them in
 * the public TopNav/Footer would double the chrome. We pick which children
 * tree to render based on the live pathname so client-side navigation
 * (e.g. "Public site" → "/") flips the chrome without a full reload.
 *
 * The two children come from `app/layout.tsx`: `portal` is the bare
 * <main>{children}</main>; `public` is <SiteShell>{children}</SiteShell>.
 */
export function ChromeSwitch({
  portal,
  publicSite
}: {
  portal: ReactNode;
  publicSite: ReactNode;
}) {
  const pathname = usePathname();
  return <>{isPortalPath(pathname) ? portal : publicSite}</>;
}
