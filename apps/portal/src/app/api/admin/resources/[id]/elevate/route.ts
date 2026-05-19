import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";
import { assertCanReview, SeparationOfDutiesError } from "@airegistry/sdk";
import { writeAudit } from "@airegistry/sdk";
import { isHttpUrl } from "@airegistry/sdk";

/**
 * POST /api/admin/resources/:id/elevate
 *
 * AIR-SPEC §11/§14 - official-resource elevation (T036).
 *
 * Attaches an `OfficialResourceAuthorisation` row from a registry-managed
 * `OfficialAuthority` to a publicly-listed resource and writes a paired
 * `TrustSignal` of kind `official_resource` so the public detail page can
 * surface the authorisation.
 *
 * Body: {
 *   officialAuthorityId: string;
 *   statusCode?: "pending" | "authorised" | "withdrawn"  (default "authorised");
 *   reference?: string;
 *   documentUrl?: string;
 *   publicNote?: string;
 *   internalNote?: string;
 *   validFrom?: string (ISO);
 *   validUntil?: string (ISO);
 *   summary: string;
 * }
 *
 * Policy gates:
 *  - Resource must currently be `listed` (no draft/needs_update elevation).
 *  - Authority must be `active` and bound to a jurisdiction.
 *  - Document URL, if present, must be an http(s) URL.
 *  - Caller cannot belong to the same provider as the resource (separation
 *    of duties via `assertCanReview`).
 */

type Body = {
  officialAuthorityId?: unknown;
  statusCode?: unknown;
  reference?: unknown;
  documentUrl?: unknown;
  publicNote?: unknown;
  internalNote?: unknown;
  validFrom?: unknown;
  validUntil?: unknown;
  summary?: unknown;
};

const ALLOWED_STATUS = new Set(["pending", "authorised", "withdrawn"]);

function parseDate(value: unknown): Date | null | "INVALID" {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return "INVALID";
  if (value.trim() === "") return null;
  const d = new Date(value.trim());
  if (Number.isNaN(d.getTime())) return "INVALID";
  return d;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json(
      { error: "Only admins may elevate resources." },
      { status: 403 }
    );
  }

  const { id: resourceId } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const officialAuthorityId =
    typeof body.officialAuthorityId === "string"
      ? body.officialAuthorityId.trim()
      : "";
  if (!officialAuthorityId) {
    return NextResponse.json(
      { error: "officialAuthorityId is required" },
      { status: 400 }
    );
  }

  const statusCode =
    typeof body.statusCode === "string" && body.statusCode.trim() !== ""
      ? body.statusCode.trim().toLowerCase()
      : "authorised";
  if (!ALLOWED_STATUS.has(statusCode)) {
    return NextResponse.json(
      { error: `statusCode must be one of: ${[...ALLOWED_STATUS].join(", ")}` },
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

  const reference =
    typeof body.reference === "string" && body.reference.trim() !== ""
      ? body.reference.trim()
      : null;
  const documentUrl =
    typeof body.documentUrl === "string" && body.documentUrl.trim() !== ""
      ? body.documentUrl.trim()
      : null;
  if (documentUrl && !isHttpUrl(documentUrl)) {
    return NextResponse.json(
      { error: "documentUrl must be an http(s) URL" },
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

  const validFrom = parseDate(body.validFrom);
  if (validFrom === "INVALID") {
    return NextResponse.json(
      { error: "validFrom must be ISO-8601" },
      { status: 400 }
    );
  }
  const validUntil = parseDate(body.validUntil);
  if (validUntil === "INVALID") {
    return NextResponse.json(
      { error: "validUntil must be ISO-8601" },
      { status: 400 }
    );
  }
  if (validFrom && validUntil && validFrom > validUntil) {
    return NextResponse.json(
      { error: "validFrom must be on or before validUntil" },
      { status: 400 }
    );
  }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: {
      lifecycleStatus: { select: { code: true } },
      provider: { select: { id: true } }
    }
  });
  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }
  if (resource.lifecycleStatus.code !== "listed") {
    return NextResponse.json(
      { error: "Only listed resources may be elevated to official." },
      { status: 409 }
    );
  }

  try {
    assertCanReview(user, { providerId: resource.provider.id });
  } catch (e) {
    if (e instanceof SeparationOfDutiesError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

  const [authority, statusRow, signalKind, passed, withdrawn] = await Promise.all([
    prisma.officialAuthority.findUnique({
      where: { id: officialAuthorityId },
      include: { jurisdiction: { select: { code: true } } }
    }),
    prisma.officialAuthorisationStatusType.findUnique({
      where: { code: statusCode }
    }),
    prisma.trustSignalType.findUnique({
      where: { code: "official_resource" }
    }),
    prisma.trustSignalStatusType.findUnique({ where: { code: "passed" } }),
    prisma.trustSignalStatusType.findUnique({ where: { code: "withdrawn" } })
  ]);
  if (!statusRow || !signalKind || !passed || !withdrawn) {
    return NextResponse.json(
      { error: "Reference data not seeded." },
      { status: 503 }
    );
  }
  if (!authority || !authority.active) {
    return NextResponse.json(
      { error: "Official authority not found or inactive" },
      { status: 404 }
    );
  }

  const signalStatusId =
    statusCode === "authorised"
      ? passed.id
      : statusCode === "withdrawn"
        ? withdrawn.id
        : passed.id; // "pending" still surfaces as positive trust during review

  const created = await prisma.$transaction(async (tx) => {
    const auth = await tx.officialResourceAuthorisation.create({
      data: {
        resourceId: resource.id,
        officialAuthorityId: authority.id,
        statusId: statusRow.id,
        authorisationReference: reference,
        authorisationDocumentUrl: documentUrl,
        publicNote,
        internalNote,
        validFrom: validFrom ?? null,
        validUntil: validUntil ?? null,
        decidedById: user.id,
        decidedAt: new Date()
      }
    });

    await tx.trustSignal.create({
      data: {
        kindId: signalKind.id,
        targetResourceId: resource.id,
        targetProviderId: resource.provider.id,
        statusId: signalStatusId,
        decisionSummary: summary,
        publicNote,
        internalNote,
        validFrom: validFrom ?? null,
        validUntil: validUntil ?? null,
        decidedById: user.id,
        decidedAt: new Date(),
        authorityOrganisation: authority.name
      }
    });

    return auth;
  });

  await writeAudit({
    actorUserId: user.id,
    entityType: "resource",
    entityId: resource.id,
    action: `resource.official.${statusCode}`,
    newValue: {
      authorisationId: created.id,
      authorityId: authority.id,
      authorityName: authority.name,
      statusCode,
      summary
    }
  });

  return NextResponse.json({
    ok: true,
    resourceId: resource.id,
    authorisationId: created.id,
    authorityId: authority.id,
    statusCode
  });
}
