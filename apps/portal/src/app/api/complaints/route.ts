import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@airegistry/sdk";
import { emailTemplates } from "@/lib/email";
import { sendTransactionalEmail } from "@/lib/email/transactional-send";
import { getPublicOrigin } from "@/lib/public-origin";

/**
 * POST /api/complaints
 *
 * Public complaint intake (T028, AIR-SPEC §13). PII minimisation:
 *
 *   - `complainantEmail` is OPTIONAL. When omitted, the complaint is
 *     accepted but the operator cannot follow up.
 *   - `complainantName` is OPTIONAL.
 *   - The submitted `description` is stored verbatim; rate-limit and abuse
 *     controls (Phase 5) are responsible for keeping the channel from
 *     becoming a spam vector.
 *
 * Body: {
 *   targetAirId?:    string,          // resolves to Resource via airId
 *   targetProviderSlug?: string,      // OR resolves to Provider via slug
 *   complaintType:   string,          // ComplaintType.code (accuracy/safety/policy/other)
 *   severity:        string,          // ComplaintSeverityType.code (low/medium/high)
 *   description:     string,          // ≥20 chars
 *   complainantName?: string,
 *   complainantEmail?: string
 * }
 *
 * Response: 202 with { id }, or 400 with errors.
 */

type ComplaintPayload = {
  targetAirId?: unknown;
  targetProviderSlug?: unknown;
  complaintType?: unknown;
  severity?: unknown;
  description?: unknown;
  complainantName?: unknown;
  complainantEmail?: unknown;
};

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^\S+@\S+\.\S+$/.test(v);
}

export async function POST(req: Request) {
  let body: ComplaintPayload;
  try {
    body = (await req.json()) as ComplaintPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors: string[] = [];
  if (typeof body.complaintType !== "string") errors.push("complaintType is required");
  if (typeof body.severity !== "string") errors.push("severity is required");
  if (typeof body.description !== "string" || body.description.trim().length < 20) {
    errors.push("description must be at least 20 characters");
  }
  if (
    body.complainantEmail !== undefined &&
    body.complainantEmail !== null &&
    body.complainantEmail !== "" &&
    !isEmail(body.complainantEmail)
  ) {
    errors.push("complainantEmail must be a valid address when provided");
  }

  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  // Resolve target - at most one of resource / provider.
  let targetResourceId: string | null = null;
  let targetProviderId: string | null = null;
  if (typeof body.targetAirId === "string") {
    const r = await prisma.resource.findUnique({
      where: { airId: body.targetAirId },
      select: { id: true }
    });
    if (!r) {
      return NextResponse.json(
        { error: `targetAirId "${body.targetAirId}" not found.` },
        { status: 404 }
      );
    }
    targetResourceId = r.id;
  } else if (typeof body.targetProviderSlug === "string") {
    const p = await prisma.provider.findUnique({
      where: { slug: body.targetProviderSlug },
      select: { id: true }
    });
    if (!p) {
      return NextResponse.json(
        { error: `targetProviderSlug "${body.targetProviderSlug}" not found.` },
        { status: 404 }
      );
    }
    targetProviderId = p.id;
  } else {
    return NextResponse.json(
      { error: "Provide targetAirId OR targetProviderSlug." },
      { status: 400 }
    );
  }

  // Look up controlled-vocab ids.
  const [type, severity, openStatus] = await Promise.all([
    prisma.complaintType.findUnique({ where: { code: body.complaintType as string } }),
    prisma.complaintSeverityType.findUnique({
      where: { code: body.severity as string }
    }),
    prisma.complaintStatusType.findUnique({ where: { code: "open" } })
  ]);
  if (!type || !severity || !openStatus) {
    return NextResponse.json(
      { error: "Reference data not seeded (run npm run db:seed)." },
      { status: 503 }
    );
  }

  const created = await prisma.complaint.create({
    data: {
      targetResourceId,
      targetProviderId,
      complaintTypeId: type.id,
      severityId: severity.id,
      statusId: openStatus.id,
      complainantName:
        typeof body.complainantName === "string" && body.complainantName.trim() !== ""
          ? body.complainantName.trim()
          : null,
      complainantEmail:
        typeof body.complainantEmail === "string" && body.complainantEmail.trim() !== ""
          ? body.complainantEmail.toLowerCase().trim()
          : null,
      description: (body.description as string).trim()
    }
  });

  await prisma.auditLog.create({
    data: {
      entityType: "complaint",
      entityId: created.id,
      action: "complaint.received",
      newValue: {
        complaintType: body.complaintType as string,
        severity: body.severity as string,
        targetResourceId,
        targetProviderId
      }
    }
  });

  const cfg = getConfig();
  const origin = getPublicOrigin(req);

  let targetSummary = "-";
  if (targetResourceId) {
    const r = await prisma.resource.findUnique({
      where: { id: targetResourceId },
      select: { title: true }
    });
    targetSummary = r ? `Resource: ${r.title}` : targetResourceId;
  } else if (targetProviderId) {
    const p = await prisma.provider.findUnique({
      where: { id: targetProviderId },
      select: { displayName: true, slug: true }
    });
    targetSummary = p ? `Provider: ${p.displayName} (${p.slug})` : targetProviderId;
  }

  if (created.complainantEmail) {
    const tmpl = emailTemplates.complaintReceivedComplainant({
      registryName: cfg.registryName,
      operatorName: cfg.operatorName,
      complaintId: created.id,
      contactUrl: `${origin}/contact`
    });
    sendTransactionalEmail("complaint_complainant", {
      to: created.complainantEmail,
      subject: tmpl.subject,
      text: tmpl.text
    });
  }

  if (cfg.operatorInboxEmail) {
    const tmpl = emailTemplates.complaintReceivedOperator({
      registryName: cfg.registryName,
      complaintId: created.id,
      complaintType: body.complaintType as string,
      severity: body.severity as string,
      targetSummary,
      adminHomeUrl: `${origin}/admin`
    });
    sendTransactionalEmail("complaint_operator", {
      to: cfg.operatorInboxEmail,
      subject: tmpl.subject,
      text: tmpl.text
    });
  }

  return NextResponse.json({ id: created.id }, { status: 202 });
}
