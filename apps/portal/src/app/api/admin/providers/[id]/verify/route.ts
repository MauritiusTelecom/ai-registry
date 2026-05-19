import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";
import { assertCanReview, SeparationOfDutiesError } from "@airegistry/sdk";
import { writeAudit } from "@airegistry/sdk";
import { getConfig } from "@airegistry/sdk";
import { emailTemplates } from "@airegistry/sdk/server";
import { uniqueValidEmails } from "@airegistry/sdk/server";
import { sendTransactionalEmailAll } from "@airegistry/sdk/server";
import { getPublicOrigin } from "@/lib/public-origin";
import { getReferenceRow } from "@airegistry/sdk/server";

/**
 * POST /api/admin/providers/:id/verify
 *
 * AIR-SPEC §11 / §18 - provider verification workflow (T035).
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
  notifyByEmail?: unknown;
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
    getReferenceRow("providerStatusType", status),
    getReferenceRow("trustSignalType", "provider_verification"),
    getReferenceRow("trustSignalStatusType", "passed"),
    getReferenceRow("trustSignalStatusType", "failed"),
    getReferenceRow("trustSignalStatusType", "withdrawn")
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

  // Suspended status hides the provider from the public registry by also
  // flipping adminSuspended. Reverting to a non-suspended status clears it.
  const providerData: { statusId: string; adminSuspended?: boolean } = {
    statusId: target.id
  };
  if (status === "suspended") {
    providerData.adminSuspended = true;
  } else if (provider.status.code === "suspended") {
    providerData.adminSuspended = false;
  }

  await prisma.$transaction(async (tx) => {
    await tx.provider.update({
      where: { id: provider.id },
      data: providerData
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

  // Email toggle. Default ON for backwards compatibility with older clients
  // that don't send the flag; only an explicit `false` opts out.
  const notifyByEmail = body.notifyByEmail !== false;
  const cfg = getConfig();
  const origin = getPublicOrigin(req);
  const recipients = uniqueValidEmails([provider.contactEmail, provider.legalContactEmail]);
  let emailNotified = false;
  if (notifyByEmail && recipients.length > 0) {
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
    emailNotified = true;
  }

  return NextResponse.json({
    ok: true,
    providerId: provider.id,
    status,
    emailNotified
  });
}
