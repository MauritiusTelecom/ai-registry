import type { ReactNode } from "react";
import { requireRole } from "@/lib/portals/auth-gate";
import { PORTAL_CONFIGS } from "@/lib/portals/nav-config";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("provider.layout");
}

// Provider portal uses the rich header chrome (search + palette + theme +
// notifications + user dropdown) per the prototype's `portal-shell.jsx`
// design. Admin / verifier / sovereign continue to use the simpler
// `PortalLayoutChrome` until they're upgraded similarly.
import { ProviderPortalChrome } from "@/components/portals/ProviderPortalChrome";

export const dynamic = "force-dynamic";

export default async function ProviderLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("provider", { redirectTo: "/provider" });
  if (user.role.code === "provider") {
    await ensureUserProviderLinked(user.id);
  }
  return (
    <ProviderPortalChrome config={PORTAL_CONFIGS.provider} user={user}>
      {children}
    </ProviderPortalChrome>
  );
}
