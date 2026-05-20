import { getCurrentUser } from "@airegistry/sdk/server";
import { loadPortalNotifications } from "@/lib/portals/notifications";
import { NotificationsBrowser } from "@/components/portals/NotificationsBrowser";

export const metadata = { title: "Admin · Notifications" };
export const dynamic = "force-dynamic";

/**
 * Full-page notifications surface for admins. Surfaces both the queue
 * roll-ups that feed the bell (Pending review queue, Open public
 * complaints) and the individual per-row reviews / complaints so the
 * admin can scan and triage from here.
 */
export default async function AdminNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const notifications = await loadPortalNotifications(user, "admin", {
    unlimited: true
  });

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Notifications</h1>
        <p className="p-subtitle">
          Open queues and recent activity across the registry. The header bell
          shows roll-ups only — this page lists each item.
        </p>
      </div>
      <NotificationsBrowser initial={notifications} />
    </div>
  );
}
