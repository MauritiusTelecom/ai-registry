import type { ReactNode } from "react";
import { requireRole } from "@/lib/portals/auth-gate";
import { PORTAL_CONFIGS } from "@/lib/portals/nav-config";
import { PortalLayoutChrome } from "@/components/portals/PortalLayoutChrome";

export const metadata = { title: "Verifier · AI Registry" };
export const dynamic = "force-dynamic";

export default async function VerifierLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("verifier", { redirectTo: "/verifier" });
  return (
    <PortalLayoutChrome config={PORTAL_CONFIGS.verifier} user={user}>
      {children}
    </PortalLayoutChrome>
  );
}
