import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { writeAudit } from "@/lib/audit/write-audit";

const EDITABLE = new Set(["draft", "needs_update"]);

/**
 * PATCH /api/portal/resources/:id - update draft / needs_update fields only.
 */

type PatchBody = {
  title?: unknown;
  shortDescription?: unknown;
  longDescription?: unknown | null;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role.code !== "provider") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const providerId = await ensureUserProviderLinked(user.id);

  const resource = await prisma.resource.findFirst({
    where: { id, providerId },
    include: { lifecycleStatus: { select: { code: true } } }
  });
  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }
  if (!EDITABLE.has(resource.lifecycleStatus.code)) {
    return NextResponse.json(
      { error: "Only draft or needs_update resources can be edited here" },
      { status: 409 }
    );
  }

  const data: { title?: string; shortDescription?: string; longDescription?: string | null } = {};
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t.length < 2) return NextResponse.json({ error: "title too short" }, { status: 400 });
    data.title = t;
  }
  if (typeof body.shortDescription === "string") {
    const s = body.shortDescription.trim();
    if (s.length < 8) {
      return NextResponse.json({ error: "shortDescription must be at least 8 characters" }, { status: 400 });
    }
    data.shortDescription = s;
  }
  if (body.longDescription === null) {
    data.longDescription = null;
  } else if (typeof body.longDescription === "string") {
    data.longDescription = body.longDescription.trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const prev = { title: resource.title, shortDescription: resource.shortDescription };
  const updated = await prisma.resource.update({
    where: { id },
    data,
    include: {
      lifecycleStatus: { select: { code: true, name: true } },
      resourceType: { select: { code: true } }
    }
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "resource",
    entityId: id,
    action: "resource.draft_updated",
    previousValue: prev,
    newValue: data
  });

  return NextResponse.json({
    ok: true,
    resource: {
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      shortDescription: updated.shortDescription,
      longDescription: updated.longDescription,
      type: updated.resourceType.code,
      lifecycle: updated.lifecycleStatus.code
    }
  });
}
