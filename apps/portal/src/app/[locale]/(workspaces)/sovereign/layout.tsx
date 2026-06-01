import type { ReactNode } from "react";
import { requireRole } from "@/lib/portals/auth-gate";
import { PORTAL_CONFIGS } from "@/lib/portals/nav-config";
import { PortalLayoutChrome } from "@/components/portals/PortalLayoutChrome";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("sovereign.layout");
}

export const dynamic = "force-dynamic";

export default async function SovereignLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("sovereign", { redirectTo: "/sovereign" });
  return (
    <PortalLayoutChrome config={PORTAL_CONFIGS.sovereign} user={user}>
      {children}
    </PortalLayoutChrome>
  );
}
