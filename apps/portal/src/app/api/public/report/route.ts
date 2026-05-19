import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@airegistry/sdk";
import { renderTemplate } from "@airegistry/sdk/server";
import { sendTransactionalEmail } from "@airegistry/sdk/server";
import { getReferenceRow } from "@airegistry/sdk/server";
import { writeAudit } from "@airegistry/sdk";

// Public report intake for the listing-detail "Report this listing" modal.
//
// The modal collects a coarse `reason` (impersonation / sovereignty /
// metadata / abuse / legal / other), free-text `notes`, and a contact
// `email`. On submission we:
//   1. Persist a row in the Complaint table (status=open, severity=medium).
//   2. Write an AuditLog entry preserving the original modal reason.
//   3. Send an acknowledgement email to the reporter — subject and body
//      come from PUBLIC_REPORT_ACK_SUBJECT / PUBLIC_REPORT_ACK_BODY in .env
//      (with built-in English defaults if those are unset).
//   4. If OPERATOR_INBOX_EMAIL is set, notify the operator inbox using
//      PUBLIC_REPORT_OPERATOR_SUBJECT / PUBLIC_REPORT_OPERATOR_BODY.
//
// No copy is hardcoded inside this handler: every operator-facing string
// lives in src/lib/config.ts and is sourced from environment variables, so
// jurisdiction-specific wording can be tuned per deployment.

const REASONS = new Set([
  "impersonation",
  "sovereignty",
  "metadata",
  "abuse",
  "legal",
  "other"
]);

// Maps the public modal reason onto the seeded ComplaintType.code values.
// ComplaintType has four codes: accuracy / safety / policy / other. The
// chosen mapping keeps semantically-related reasons together so admins can
// triage by category. The original modal reason is preserved in the audit
// log and surfaced as `{reason}` in the operator notification email.
const REASON_TO_TYPE: Record<string, string> = {
  impersonation: "policy",
  sovereignty: "policy",
  metadata: "accuracy",
  abuse: "safety",
  legal: "policy",
  other: "other"
};

type ReportPayload = {
  resourceId?: string;
  reason?: string;
  notes?: string;
  email?: string;
};

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^\S+@\S+\.\S+$/.test(value);
}

export async function POST(req: Request) {
  let payload: ReportPayload;
  try {
    payload = (await req.json()) as ReportPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors: string[] = [];
  if (!payload.resourceId || typeof payload.resourceId !== "string") {
    errors.push("resourceId is required");
  }
  if (!payload.reason || !REASONS.has(payload.reason)) {
    errors.push("reason must be one of: " + [...REASONS].join(", "));
  }
  if (
    !payload.notes ||
    typeof payload.notes !== "string" ||
    payload.notes.trim().length < 12
  ) {
    errors.push("notes must be at least 12 characters");
  }
  if (!isEmail(payload.email)) {
    errors.push("email must be valid");
  }

  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  // Confirm the resource exists before opening a complaint against it.
  const resource = await prisma.resource.findUnique({
    where: { id: payload.resourceId as string },
    select: { id: true, title: true, airId: true }
  });
  if (!resource) {
    return NextResponse.json(
      { error: `resourceId "${payload.resourceId}" not found.` },
      { status: 404 }
    );
  }

  // Resolve controlled-vocab ids. Severity defaults to "medium" since the
  // public modal doesn't ask for one; status defaults to "open" so the
  // admin queue picks the new complaint up immediately.
  const typeCode = REASON_TO_TYPE[payload.reason as string] ?? "other";
  const [complaintType, severity, openStatus] = await Promise.all([
    getReferenceRow("complaintType", typeCode),
    getReferenceRow("complaintSeverityType", "medium"),
    getReferenceRow("complaintStatusType", "open")
  ]);
  if (!complaintType || !severity || !openStatus) {
    return NextResponse.json(
      { error: "Reference data not seeded (run npm run db:seed)." },
      { status: 503 }
    );
  }

  const complainantEmail = (payload.email as string).toLowerCase().trim();
  const created = await prisma.complaint.create({
    data: {
      targetResourceId: resource.id,
      complaintTypeId: complaintType.id,
      severityId: severity.id,
      statusId: openStatus.id,
      complainantEmail,
      description: (payload.notes as string).trim()
    }
  });

  // Audit log preserves the original modal reason so reviewers can see
  // exactly which option the reporter picked (the Complaint row only keeps
  // the mapped ComplaintType).
  await writeAudit({
    entityType: "complaint",
    entityId: created.id,
    action: "public.report.received",
    newValue: {
      reason: payload.reason as string,
      complaintType: typeCode,
      severity: "medium",
      targetResourceId: resource.id,
      source: "listing-report-modal"
    }
  });

  // Send transactional emails (non-blocking — failures are logged, not
  // surfaced to the user; the modal's success state is driven by the 202).
  const cfg = getConfig();
  const templateVars: Record<string, string> = {
    registryName: cfg.registryName,
    operatorName: cfg.operatorName,
    complaintId: created.id,
    reason: payload.reason as string,
    complaintType: typeCode,
    severity: "medium",
    targetSummary: `Resource: ${resource.title}${resource.airId ? ` (${resource.airId})` : ""}`,
    contactUrl: cfg.publicContactUrl,
    adminHomeUrl: cfg.adminHomeUrl
  };

  sendTransactionalEmail("public_report_complainant", {
    to: complainantEmail,
    subject: renderTemplate(cfg.publicReportEmail.ackSubject, templateVars),
    text: renderTemplate(cfg.publicReportEmail.ackBody, templateVars)
  });

  if (cfg.operatorInboxEmail) {
    sendTransactionalEmail("public_report_operator", {
      to: cfg.operatorInboxEmail,
      subject: renderTemplate(cfg.publicReportEmail.operatorSubject, templateVars),
      text: renderTemplate(cfg.publicReportEmail.operatorBody, templateVars)
    });
  }

  // Keep the structured log line for ops visibility.
  console.info(
    JSON.stringify({
      event: "public.report.received",
      complaintId: created.id,
      resourceId: resource.id,
      reason: payload.reason,
      complaintType: typeCode,
      notesLength: (payload.notes as string).length,
      ts: new Date().toISOString()
    })
  );

  return NextResponse.json({ accepted: true, id: created.id }, { status: 202 });
}
