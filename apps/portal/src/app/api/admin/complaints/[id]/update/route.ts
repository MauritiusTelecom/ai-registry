import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@airegistry/sdk";
import { getConfig } from "@airegistry/sdk";
import { emailTemplates } from "@airegistry/sdk/server";
import { sendTransactionalEmail } from "@airegistry/sdk/server";
import { getPublicOrigin } from "@/lib/public-origin";

/**
 * POST /api/admin/complaints/:id/update
 *
 * Partial update of a complaint by the operator. Accepts any combination of:
 *   - statusId         (must reference an existing ComplaintStatusType)
 *   - assignedToId     (User uuid, "" / null to unassign)
 *   - resolutionSummary (string, null, or "" to clear)
 *   - notifyAssignee   (boolean; default true) - when the assignment changed
 *                       to a non-null user and they have an email address,
 *                       send them a "complaint assigned to you" email.
 *
 * Status invariants:
 *   - When the result status is `resolved` / `rejected`, `resolvedAt` is set
 *     to now() (if not already set). Going back to `open` / `investigating`
 *     clears `resolvedAt`.
 *   - When an `open` complaint is first assigned (was unassigned, now has an
 *     assignee) and the operator did not explicitly change status, the
 *     status is auto-bumped to `investigating` so the queue reflects that
 *     work has started.
 *
 * Audit actions emitted (so the audit log is grep-friendly):
 *   - complaint.assigned       (was unassigned → now assigned)
 *   - complaint.reassigned     (was assigned to A → now assigned to B)
 *   - complaint.unassigned     (was assigned → now unassigned)
 *   - complaint.status_changed (status changed and nothing else)
 *   - complaint.resolved       (status changed to resolved/rejected)
 *   - complaint.updated        (everything else, or multiple fields changed)
 */

type Body = {
  statusId?: unknown;
  assignedToId?: unknown;
  resolutionSummary?: unknown;
  notifyAssignee?: unknown;
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
      description: true,
      statusId: true,
      status: { select: { code: true, name: true } },
      assignedToId: true,
      resolutionSummary: true,
      resolvedAt: true,
      complaintType: { select: { name: true } },
      severity: { select: { name: true } },
      targetResource: {
        select: { title: true, provider: { select: { displayName: true } } }
      },
      targetProvider: { select: { displayName: true } }
    }
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    statusId?: string;
    assignedToId?: string | null;
    resolutionSummary?: string | null;
    resolvedAt?: Date | null;
  } = {};

  // ─── Status ─────────────────────────────────────────
  let newStatusCode = current.status.code;
  let newStatusName = current.status.name;
  let statusExplicitlyChanged = false;
  if (typeof body.statusId === "string" && body.statusId !== current.statusId) {
    const s = await prisma.complaintStatusType.findUnique({
      where: { id: body.statusId },
      select: { id: true, code: true, name: true }
    });
    if (!s) return NextResponse.json({ error: "Invalid statusId" }, { status: 400 });
    data.statusId = s.id;
    newStatusCode = s.code;
    newStatusName = s.name;
    statusExplicitlyChanged = true;
  }

  // ─── Assignment ─────────────────────────────────────
  let newAssigneeId: string | null = current.assignedToId;
  let newAssigneeRecord: { id: string; name: string; email: string } | null = null;
  let assignmentChanged = false;
  if (body.assignedToId === null || body.assignedToId === "") {
    if (current.assignedToId !== null) {
      data.assignedToId = null;
      newAssigneeId = null;
      assignmentChanged = true;
    }
  } else if (typeof body.assignedToId === "string") {
    if (body.assignedToId !== current.assignedToId) {
      const u = await prisma.user.findUnique({
        where: { id: body.assignedToId },
        select: { id: true, name: true, email: true }
      });
      if (!u) return NextResponse.json({ error: "Invalid assignedToId" }, { status: 400 });
      data.assignedToId = u.id;
      newAssigneeId = u.id;
      newAssigneeRecord = u;
      assignmentChanged = true;
    }
  }

  // ─── Resolution summary ─────────────────────────────
  let resolutionChanged = false;
  if (body.resolutionSummary === null || body.resolutionSummary === "") {
    if (current.resolutionSummary !== null) {
      data.resolutionSummary = null;
      resolutionChanged = true;
    }
  } else if (typeof body.resolutionSummary === "string") {
    const next = body.resolutionSummary.trim() || null;
    if (next !== current.resolutionSummary) {
      data.resolutionSummary = next;
      resolutionChanged = true;
    }
  }

  // ─── Auto-bump: open + first assignment → investigating ──
  // Only kicks in when the operator left the status alone — if they
  // explicitly chose a status, we respect that.
  let autoBumped = false;
  if (
    !statusExplicitlyChanged &&
    assignmentChanged &&
    newAssigneeId !== null &&
    current.assignedToId === null &&
    current.status.code === "open"
  ) {
    const investigating = await prisma.complaintStatusType.findUnique({
      where: { code: "investigating" },
      select: { id: true, code: true, name: true }
    });
    if (investigating) {
      data.statusId = investigating.id;
      newStatusCode = investigating.code;
      newStatusName = investigating.name;
      autoBumped = true;
    }
  }

  // ─── Maintain resolvedAt invariants ─────────────────
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

  // ─── Audit: pick the most specific action label ─────
  const statusActuallyChanged = statusExplicitlyChanged || autoBumped;
  const action = pickAuditAction({
    assignmentChanged,
    wasAssigned: current.assignedToId !== null,
    nowAssigned: newAssigneeId !== null,
    statusChanged: statusActuallyChanged,
    newStatusCode,
    resolutionChanged
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "complaint",
    entityId: id,
    action,
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
      resolvedAt: updated.resolvedAt,
      autoBumped
    }
  });

  // ─── Notify the new assignee ────────────────────────
  // Default to true so a missing flag from older clients still notifies.
  const notifyAssignee = body.notifyAssignee !== false;
  let emailNotified = false;
  if (
    assignmentChanged &&
    notifyAssignee &&
    newAssigneeId !== null &&
    newAssigneeRecord !== null &&
    newAssigneeRecord.email
  ) {
    const cfg = getConfig();
    const origin = getPublicOrigin(req);
    const targetSummary = current.targetResource
      ? `${current.targetResource.title} · ${current.targetResource.provider.displayName}`
      : current.targetProvider
        ? `Provider · ${current.targetProvider.displayName}`
        : "—";

    const tmpl = emailTemplates.complaintAssigned({
      registryName: cfg.registryName,
      assigneeName: newAssigneeRecord.name,
      assignedByName: user.name,
      complaintId: id,
      complaintType: current.complaintType.name,
      severity: current.severity.name,
      targetSummary,
      statusLabel: newStatusName,
      description: current.description,
      complaintUrl: `${origin}/admin/complaints/${id}`
    });
    sendTransactionalEmail("complaint_assigned", {
      to: newAssigneeRecord.email,
      subject: tmpl.subject,
      text: tmpl.text
    });
    emailNotified = true;
  }

  return NextResponse.json({
    ok: true,
    changed: true,
    autoBumped,
    emailNotified,
    action
  });
}

function pickAuditAction(opts: {
  assignmentChanged: boolean;
  wasAssigned: boolean;
  nowAssigned: boolean;
  statusChanged: boolean;
  newStatusCode: string;
  resolutionChanged: boolean;
}): string {
  // Resolution is the strongest signal - if status is now resolved/rejected,
  // emit a `resolved` action so audit consumers can filter on closures.
  if (opts.statusChanged && (opts.newStatusCode === "resolved" || opts.newStatusCode === "rejected")) {
    return "complaint.resolved";
  }

  const onlyAssignmentChanged =
    opts.assignmentChanged && !opts.statusChanged && !opts.resolutionChanged;
  if (onlyAssignmentChanged) {
    if (!opts.wasAssigned && opts.nowAssigned) return "complaint.assigned";
    if (opts.wasAssigned && !opts.nowAssigned) return "complaint.unassigned";
    if (opts.wasAssigned && opts.nowAssigned) return "complaint.reassigned";
  }

  const onlyStatusChanged =
    opts.statusChanged && !opts.assignmentChanged && !opts.resolutionChanged;
  if (onlyStatusChanged) return "complaint.status_changed";

  return "complaint.updated";
}
