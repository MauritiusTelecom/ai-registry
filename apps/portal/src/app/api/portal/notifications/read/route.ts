import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/portal/notifications/read
 *
 * Body: { ids: string[] }
 *
 * Marks one or more portal-header notifications as read for the current
 * user. Idempotent — re-posting the same id is a no-op thanks to the
 * (userId, notificationKey) unique constraint on `NotificationRead`. The
 * client component fires this fire-and-forget after an optimistic UI
 * update; a non-200 response leaves the local state showing the entry as
 * read but the next page render restores `unread = true` because the
 * receipt was never persisted.
 *
 * Returns the count of new read-receipts written, so the client can
 * surface a friendly summary if needed.
 */

type Body = { ids?: unknown };

const MAX_IDS_PER_REQUEST = 100;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((v): v is string => typeof v === "string" && v.trim() !== "")
    : null;
  if (!ids || ids.length === 0) {
    return NextResponse.json(
      { error: "`ids` must be a non-empty array of strings." },
      { status: 400 }
    );
  }
  if (ids.length > MAX_IDS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Too many ids (max ${MAX_IDS_PER_REQUEST}).` },
      { status: 400 }
    );
  }

  // Persist as a single createMany with skipDuplicates so a re-post (two
  // tabs, slow network) doesn't trip the unique constraint. The composite
  // unique on (userId, notificationKey) does the dedupe.
  const result = await prisma.notificationRead.createMany({
    data: ids.map((notificationKey) => ({
      userId: user.id,
      notificationKey
    })),
    skipDuplicates: true
  });

  return NextResponse.json({ ok: true, written: result.count });
}
