import type { ReactNode } from "react";
import { requireRole } from "@/lib/portals/auth-gate";
import { PORTAL_CONFIGS } from "@/lib/portals/nav-config";
import { PortalLayoutChrome } from "@/components/portals/PortalLayoutChrome";

export const metadata = { title: "Admin · AI Registry" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("admin", { redirectTo: "/admin" });
  return (
    <PortalLayoutChrome config={PORTAL_CONFIGS.admin} user={user}>
      {children}
    </PortalLayoutChrome>
  );
}
