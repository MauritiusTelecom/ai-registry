import { NextResponse } from "next/server";
import {
  getCurrentUser,
  listPortalNotificationKeys,
  markNotificationsRead,
  type PortalRole
} from "@airegistry/sdk/server";

/**
 * POST /api/portal/notifications/read-all
 *
 * Marks every notification currently visible to the user as read.
 *
 * The set of keys is re-derived on the server (via `listPortalNotificationKeys`)
 * rather than trusted from the request body, so a malicious client can't
 * persist arbitrary keys it shouldn't have visibility into.
 *
 * Returns the count of new read-receipts written.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Pick the same role the bell uses to render: admin overrides every
  // other role so an admin viewing the provider portal still sees the
  // admin queue feed. This mirrors the resolution in PortalLayoutChrome /
  // ProviderPortalChrome.
  const currentRole: PortalRole = user.roles.includes("admin")
    ? "admin"
    : user.roles.includes("provider")
      ? "provider"
      : user.roles.includes("verifier")
        ? "verifier"
        : "sovereign";

  const keys = await listPortalNotificationKeys(user, currentRole);
  const { written } = await markNotificationsRead(user.id, keys);
  return NextResponse.json({ ok: true, written });
}
