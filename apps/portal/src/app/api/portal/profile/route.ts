import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@airegistry/sdk";

/**
 * PATCH /api/portal/profile
 *
 * Body: { name?: string, organisationName?: string | null }
 * Provider (or any signed-in) user may update display name and organisation.
 */

type Body = { name?: unknown; organisationName?: unknown };

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: { name?: string; organisationName?: string | null } = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "name must be at least 2 characters" }, { status: 400 });
    }
    updates.name = name;
  }
  if (body.organisationName === null || body.organisationName === "") {
    updates.organisationName = null;
  } else if (typeof body.organisationName === "string") {
    updates.organisationName = body.organisationName.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const prev = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, organisationName: true }
  });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updates,
    select: { id: true, name: true, organisationName: true, email: true }
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "user",
    entityId: user.id,
    action: "user.profile_updated",
    previousValue: prev,
    newValue: { name: updated.name, organisationName: updated.organisationName }
  });

  return NextResponse.json({ ok: true, user: updated });
}
