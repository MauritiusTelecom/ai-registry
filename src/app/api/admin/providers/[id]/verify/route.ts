import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { assertCanReview, SeparationOfDutiesError } from "@/lib/auth/separation-of-duties";
import { writeAudit } from "@/lib/audit/write-audit";
import { getConfig } from "@/lib/config";
import { emailTemplates } from "@/lib/email";
import { uniqueValidEmails } from "@/lib/email/recipients";
import { sendTransactionalEmailAll } from "@/lib/email/transactional-send";

/**
 * POST /api/admin/providers/:id/verify
 *
 * AIR-SPEC §11 / §18 — provider verification workflow (T035).
 *
 * Body: { status: "verified" | "official_provider" | "unverified" | "suspended",
 *         summary: string, publicNote?: string, internalNote?: string }
 *
 * Side effects:
 *  - Updates `Provider.statusId` to the requested code.
 *  - Writes a TrustSignal of kind `provider_verification` (`passed` / `withdrawn` /
 *    `failed`) so the public-facing trust panel reflects the decision.
 *  - Appends one append-only `AuditLog` row capturing before/after status.
 *
 * Conflict-of-interest: an admin/reviewer linked to the same provider record
 * cannot self-verify (`assertCanReview` reuses the §11 separation-of-duties
 * guard already wired into review approvals).
 */

const ALLOWED = new Set([
  "verified",
  "official_provider",
  "unverified",
  "suspended"
]);

type Body = {
  status?: unknown;
  summary?: unknown;
  publicNote?: unknown;
  internalNote?: unknown;
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json(
      { error: "Only admins may change provider verification." },
      { status: 403 }
    );
  }

  const { id: providerId } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status =
    typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
  if (!ALLOWED.has(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${[...ALLOWED].join(", ")}` },
      { status: 400 }
    );
  }
  const summary =
    typeof body.summary === "string" ? body.summary.trim() : "";
  if (summary.length < 4) {
    return NextResponse.json(
      { error: "summary is required (min 4 characters)" },
      { status: 400 }
    );
  }
  const publicNote =
    typeof body.publicNote === "string" && body.publicNote.trim() !== ""
      ? body.publicNote.trim()
      : null;
  const internalNote =
    typeof body.internalNote === "string" && body.internalNote.trim() !== ""
      ? body.internalNote.trim()
      : null;

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { status: { select: { code: true, name: true } } }
  });
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  try {
    assertCanReview(user, { providerId: provider.id });
  } catch (e) {
    if (e instanceof SeparationOfDutiesError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

  const [target, signalKind, passed, failed, withdrawn] = await Promise.all([
    prisma.providerStatusType.findUnique({ where: { code: status } }),
    prisma.trustSignalType.findUnique({
      where: { code: "provider_verification" }
    }),
    prisma.trustSignalStatusType.findUnique({ where: { code: "passed" } }),
    prisma.trustSignalStatusType.findUnique({ where: { code: "failed" } }),
    prisma.trustSignalStatusType.findUnique({ where: { code: "withdrawn" } })
  ]);
  if (!target || !signalKind || !passed || !failed || !withdrawn) {
    return NextResponse.json(
      { error: "Reference data not seeded." },
      { status: 503 }
    );
  }

  const signalStatusId =
    status === "verified" || status === "official_provider"
      ? passed.id
      : status === "suspended"
        ? failed.id
        : withdrawn.id;

  const before = { status: provider.status.code };

  await prisma.$transaction(async (tx) => {
    await tx.provider.update({
      where: { id: provider.id },
      data: { statusId: target.id }
    });

    await tx.trustSignal.create({
      data: {
        kindId: signalKind.id,
        targetProviderId: provider.id,
        statusId: signalStatusId,
        decisionSummary: summary,
        publicNote,
        internalNote,
        decidedById: user.id,
        decidedAt: new Date()
      }
    });
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "provider",
    entityId: provider.id,
    action: `provider.verification.${status}`,
    previousValue: before,
    newValue: { status, summary }
  });

  const cfg = getConfig();
  const origin = new URL(req.url).origin;
  const recipients = uniqueValidEmails([provider.contactEmail, provider.legalContactEmail]);
  if (recipients.length > 0) {
    const tmpl = emailTemplates.providerVerificationUpdate({
      registryName: cfg.registryName,
      providerDisplayName: provider.displayName,
      statusLabel: target.name,
      summary,
      publicNote,
      portalSettingsUrl: `${origin}/provider/settings`
    });
    sendTransactionalEmailAll("provider_verification", recipients, (to) => ({
      to,
      subject: tmpl.subject,
      text: tmpl.text
    }));
  }

  return NextResponse.json({
    ok: true,
    providerId: provider.id,
    status
  });
}
