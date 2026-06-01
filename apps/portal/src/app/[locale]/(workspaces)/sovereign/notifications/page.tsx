import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { loadPortalNotifications } from "@/lib/portals/notifications";
import { NotificationsBrowser } from "@/components/portals/NotificationsBrowser";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("sovereign.notifications");
}

export const dynamic = "force-dynamic";

export default async function SovereignNotificationsPage() {
  const t = await getTranslations("sovereign.notifications");
  const user = await getCurrentUser();
  if (!user) return null;
  const notifications = await loadPortalNotifications(user, "sovereign", {
    unlimited: true
  });
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
      </div>
      <NotificationsBrowser initial={notifications} />
    </div>
  );
}
