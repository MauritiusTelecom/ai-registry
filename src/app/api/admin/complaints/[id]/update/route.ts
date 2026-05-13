import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/write-audit";

/**
 * POST /api/admin/complaints/:id/update
 *
 * Partial update of a complaint by the operator. Accepts any combination of:
 *   - statusId (must reference an existing ComplaintStatusType)
 *   - assignedToId (User uuid, or null to unassign)
 *   - resolutionSummary (string or null)
 *
 * When the new status is `resolved` or `rejected`, `resolvedAt` is set to
 * `now()`. Going back to `open` / `investigating` clears `resolvedAt`.
 */

type Body = {
  statusId?: unknown;
  assignedToId?: unknown;
  resolutionSummary?: unknown;
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const current = await prisma.complaint.findUnique({
    where: { id },
    select: {
      id: true,
      statusId: true,
      status: { select: { code: true } },
      assignedToId: true,
      resolutionSummary: true,
      resolvedAt: true
    }
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    statusId?: string;
    assignedToId?: string | null;
    resolutionSummary?: string | null;
    resolvedAt?: Date | null;
  } = {};

  let newStatusCode = current.status.code;
  if (typeof body.statusId === "string" && body.statusId !== current.statusId) {
    const s = await prisma.complaintStatusType.findUnique({
      where: { id: body.statusId },
      select: { id: true, code: true }
    });
    if (!s) return NextResponse.json({ error: "Invalid statusId" }, { status: 400 });
    data.statusId = s.id;
    newStatusCode = s.code;
  }

  if (body.assignedToId === null || body.assignedToId === "") {
    data.assignedToId = null;
  } else if (typeof body.assignedToId === "string") {
    const u = await prisma.user.findUnique({
      where: { id: body.assignedToId },
      select: { id: true }
    });
    if (!u) return NextResponse.json({ error: "Invalid assignedToId" }, { status: 400 });
    data.assignedToId = u.id;
  }

  if (body.resolutionSummary === null || body.resolutionSummary === "") {
    data.resolutionSummary = null;
  } else if (typeof body.resolutionSummary === "string") {
    data.resolutionSummary = body.resolutionSummary.trim() || null;
  }

  // Maintain resolvedAt invariants based on the resulting status.
  if (newStatusCode === "resolved" || newStatusCode === "rejected") {
    if (!current.resolvedAt) data.resolvedAt = new Date();
  } else if (current.resolvedAt) {
    data.resolvedAt = null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, changed: false });
  }

  const updated = await prisma.complaint.update({
    where: { id },
    data,
    select: {
      id: true,
      statusId: true,
      assignedToId: true,
      resolutionSummary: true,
      resolvedAt: true
    }
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "complaint",
    entityId: id,
    action: "complaint.updated",
    previousValue: {
      statusId: current.statusId,
      assignedToId: current.assignedToId,
      resolutionSummary: current.resolutionSummary,
      resolvedAt: current.resolvedAt
    },
    newValue: {
      statusId: updated.statusId,
      assignedToId: updated.assignedToId,
      resolutionSummary: updated.resolutionSummary,
      resolvedAt: updated.resolvedAt
    }
  });

  return NextResponse.json({ ok: true, changed: true });
}
