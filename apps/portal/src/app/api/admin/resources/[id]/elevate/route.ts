import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getReferenceRow,
  loadAdminResourceForElevate,
  findOfficialAuthorityFull,
  applyAdminResourceElevate
} from "@airegistry/sdk/server";
import { assertCanReview, SeparationOfDutiesError } from "@airegistry/sdk";
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

  const resource = await loadAdminResourceForElevate(resourceId);
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
    findOfficialAuthorityFull(officialAuthorityId),
    getReferenceRow("officialAuthorisationStatusType", statusCode),
    getReferenceRow("trustSignalType", "official_resource"),
    getReferenceRow("trustSignalStatusType", "passed"),
    getReferenceRow("trustSignalStatusType", "withdrawn")
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

  const result = await applyAdminResourceElevate(user.id, {
    authorisation: {
      resourceId: resource.id,
      officialAuthorityId: authority.id,
      statusId: statusRow.id,
      authorisationReference: reference,
      authorisationDocumentUrl: documentUrl,
      publicNote,
      internalNote,
      validFrom: validFrom ?? null,
      validUntil: validUntil ?? null,
      decidedAt: new Date()
    },
    trustSignal: {
      kindId: signalKind.id,
      targetResourceId: resource.id,
      targetProviderId: resource.provider.id,
      statusId: signalStatusId,
      decisionSummary: summary,
      publicNote,
      internalNote,
      validFrom: validFrom ?? null,
      validUntil: validUntil ?? null,
      decidedAt: new Date(),
      authorityOrganisation: authority.name
    },
    audit: {
      action: `resource.official.${statusCode}`,
      newValue: {
        authorityId: authority.id,
        authorityName: authority.name,
        statusCode,
        summary
      }
    }
  });

  return NextResponse.json({
    ok: true,
    resourceId: resource.id,
    authorisationId: result.authorisationId,
    authorityId: authority.id,
    statusCode
  });
}
