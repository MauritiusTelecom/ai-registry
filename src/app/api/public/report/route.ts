import { NextResponse } from "next/server";

// Phase 0 stub: validate the shape of public report submissions and log them
// at the application layer. Persistence is wired in a later phase together with
// the audit module (see ai-registry-specs/.speckit/tasks.md, T037).

const REASONS = new Set([
  "impersonation",
  "sovereignty",
  "metadata",
  "abuse",
  "legal",
  "other"
]);

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
  if (!payload.notes || typeof payload.notes !== "string" || payload.notes.trim().length < 12) {
    errors.push("notes must be at least 12 characters");
  }
  if (!isEmail(payload.email)) {
    errors.push("email must be valid");
  }

  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  // Structured log line — replace with audit/db once available.
  console.info(
    JSON.stringify({
      event: "public.report.received",
      resourceId: payload.resourceId,
      reason: payload.reason,
      notesLength: payload.notes?.length ?? 0,
      ts: new Date().toISOString()
    })
  );

  return NextResponse.json({ accepted: true }, { status: 202 });
}
