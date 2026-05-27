import type { ReactNode } from "react";
import { SiteShell } from "@airegistry/public/shell";

/**
 * Public route group: marketing site chrome (nav, footer, auth context).
 * URLs are unchanged — the `(public)` segment is omitted from paths.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
