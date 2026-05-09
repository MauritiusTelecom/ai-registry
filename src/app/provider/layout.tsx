import type { ReactNode } from "react";
import { requireRole } from "@/lib/portals/auth-gate";
import { PORTAL_CONFIGS } from "@/lib/portals/nav-config";
import { PortalLayoutChrome } from "@/components/portals/PortalLayoutChrome";

export const metadata = { title: "Provider · AI Registry" };
export const dynamic = "force-dynamic";

export default async function ProviderLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("provider", { redirectTo: "/provider" });
  return (
    <PortalLayoutChrome config={PORTAL_CONFIGS.provider} user={user}>
      {children}
    </PortalLayoutChrome>
  );
}
