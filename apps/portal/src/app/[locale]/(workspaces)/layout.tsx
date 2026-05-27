import type { ReactNode } from "react";

/**
 * Role workspace route group (/admin, /provider, /verifier, /sovereign, /portal).
 * Each subtree mounts its own PortalLayoutChrome; this layout passes children through.
 */
export default function WorkspacesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
