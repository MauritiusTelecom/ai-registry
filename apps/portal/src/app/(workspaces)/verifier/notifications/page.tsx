import { getCurrentUser } from "@airegistry/sdk/server";
import { loadPortalNotifications } from "@/lib/portals/notifications";
import { NotificationsBrowser } from "@/components/portals/NotificationsBrowser";

export const metadata = { title: "Verifier · Notifications" };
export const dynamic = "force-dynamic";

export default async function VerifierNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const notifications = await loadPortalNotifications(user, "verifier", {
    unlimited: true
  });
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Notifications</h1>
        <p className="p-subtitle">
          Verifier-scoped queue alerts. Empty for now — wire up when the
          verifier surface lands.
        </p>
      </div>
      <NotificationsBrowser initial={notifications} />
    </div>
  );
}
