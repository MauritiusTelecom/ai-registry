import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@airegistry/sdk";

/**
 * DELETE /api/admin/complaints/:id
 *
 * Permanently delete a complaint. Enforcement actions that referenced it
 * survive (the FK is nullable) but their `relatedComplaintId` becomes null.
 * The audit log retains a snapshot of the deleted row.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const existing = await prisma.complaint.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.enforcementAction.updateMany({
      where: { relatedComplaintId: id },
      data: { relatedComplaintId: null }
    });
    await tx.complaint.delete({ where: { id } });
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "complaint",
    entityId: id,
    action: "complaint.deleted",
    previousValue: {
      complaintTypeId: existing.complaintTypeId,
      severityId: existing.severityId,
      statusId: existing.statusId,
      description: existing.description,
      complainantEmail: existing.complainantEmail
    }
  });
