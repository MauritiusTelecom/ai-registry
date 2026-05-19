import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";
import {
  listNotificationKeysFor,
  type PortalRole
} from "@/lib/portals/notifications";

/**
 * POST /api/portal/notifications/read-all
 *
 * Marks every notification currently visible to the user as read.
 *
 * The set of keys is re-derived on the server (via `listNotificationKeysFor`)
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

  const keys = await listNotificationKeysFor(user, currentRole);
  if (keys.length === 0) {
    return NextResponse.json({ ok: true, written: 0 });
  }

  const result = await prisma.notificationRead.createMany({
    data: keys.map((notificationKey) => ({
      userId: user.id,
      notificationKey
    })),
    skipDuplicates: true
  });

  return NextResponse.json({ ok: true, written: result.count });
}
