import { getCurrentUser } from "@airegistry/sdk/server";
import { loadPortalNotifications } from "@/lib/portals/notifications";
import { NotificationsBrowser } from "@/components/portals/NotificationsBrowser";

export const metadata = { title: "Provider · Notifications" };
export const dynamic = "force-dynamic";

/**
 * Full-page notifications surface for the provider portal.
 *
 * Re-derives the same role-scoped entries that feed the header bell, but
 * with the wider `unlimited` window so search / filter / pagination have
 * something to work with. The page is intentionally thin — the
 * NotificationsBrowser client component owns all the interaction state.
 */
export default async function ProviderNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const notifications = await loadPortalNotifications(user, "provider", {
    unlimited: true
  });

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Notifications</h1>
        <p className="p-subtitle">
          Reviews, complaints, and recent decisions affecting{" "}
          {user.provider?.displayName ?? "your organisation"}. The header bell
          shows the most recent few — this page is the full feed.
        </p>
      </div>
      <NotificationsBrowser initial={notifications} />
    </div>
  );
}
