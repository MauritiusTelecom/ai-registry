import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@airegistry/sdk";
import { isHttpUrl } from "@airegistry/sdk";
import { getConfig } from "@airegistry/sdk";
import { emailTemplates } from "@/lib/email";
import { uniqueValidEmails } from "@/lib/email/recipients";
import { sendTransactionalEmailAll } from "@/lib/email/transactional-send";
import { getPublicOrigin } from "@/lib/public-origin";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * PATCH /api/admin/providers/:id - edit profile fields. Slug + statusId are
 *   immutable via this route (use `/verify` for status, slug is hard-pinned).
 * DELETE /api/admin/providers/:id - hard delete; refused when the provider
 *   has any resources, users, audit references, or trust signals attached.
 *
 * See `ai-registry-specs/shared/admin-crud.md` §5.2.
 */

type Body = {
  displayName?: unknown;
  typeCode?: unknown;
  jurisdictionCode?: unknown;
  contactEmail?: unknown;
  legalContactEmail?: unknown | null;
  legalName?: unknown | null;
  registrationNumber?: unknown | null;
  websiteUrl?: unknown | null;
  documentationUrl?: unknown | null;
  description?: unknown | null;
  incidentChannel?: unknown | null;
  oncallEmail?: unknown | null;
  webhookUrl?: unknown | null;
  published?: unknown;
  adminSuspended?: unknown;
  notifyByEmail?: unknown;
  visibilityChangeReason?: unknown;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const target = await prisma.provider.findUnique({
    where: { id },
    include: {
      type: { select: { code: true } },
      homeJurisdiction: { select: { code: true } }
    }
  });
  if (!target) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  const beforePublished = target.published;
  const beforeAdminSuspended = target.adminSuspended;

  const data: Record<string, unknown> = {};
  const before = {
    displayName: target.displayName,
    contactEmail: target.contactEmail,
    legalContactEmail: target.legalContactEmail,
    legalName: target.legalName,
    registrationNumber: target.registrationNumber,
    websiteUrl: target.websiteUrl,
    documentationUrl: target.documentationUrl,
    description: target.description,
    incidentChannel: target.incidentChannel,
    oncallEmail: target.oncallEmail,
    webhookUrl: target.webhookUrl,
    type: target.type.code,
    jurisdiction: target.homeJurisdiction.code
  };

  if (typeof body.displayName === "string") {
    const t = body.displayName.trim();
    if (t.length < 2) {
      return NextResponse.json({ error: "displayName too short" }, { status: 400 });
    }
    data.displayName = t;
  }
  if (typeof body.contactEmail === "string") {
    const t = body.contactEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(t)) {
      return NextResponse.json({ error: "contactEmail must be valid" }, { status: 400 });
    }
    data.contactEmail = t;
  }
  if (typeof body.typeCode === "string" && body.typeCode.trim() !== "") {
    const code = body.typeCode.trim().toLowerCase();
    if (code !== target.type.code) {
      const t = await prisma.providerTypeRef.findUnique({ where: { code } });
      if (!t) return NextResponse.json({ error: "Unknown typeCode" }, { status: 400 });
      data.typeId = t.id;
    }
  }
  if (typeof body.jurisdictionCode === "string" && body.jurisdictionCode.trim() !== "") {
    const code = body.jurisdictionCode.trim().toUpperCase();
    if (code !== target.homeJurisdiction.code) {
      const j = await prisma.jurisdiction.findUnique({ where: { code } });
      if (!j) return NextResponse.json({ error: "Unknown jurisdictionCode" }, { status: 400 });
      data.homeJurisdictionId = j.id;
    }
  }

  function nullable(v: unknown): string | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t === "" ? null : t;
  }

  const legalName = nullable(body.legalName);
  if (legalName !== undefined) data.legalName = legalName;
  const registrationNumber = nullable(body.registrationNumber);
  if (registrationNumber !== undefined) data.registrationNumber = registrationNumber;
  const description = nullable(body.description);
  if (description !== undefined) data.description = description;
  const incidentChannel = nullable(body.incidentChannel);
  if (incidentChannel !== undefined) data.incidentChannel = incidentChannel;

  const legalContactEmail = nullable(body.legalContactEmail);
  if (legalContactEmail !== undefined) {
    if (legalContactEmail && !EMAIL_RE.test(legalContactEmail.toLowerCase())) {
      return NextResponse.json(
        { error: "legalContactEmail must be valid" },
        { status: 400 }
      );
    }
    data.legalContactEmail = legalContactEmail ? legalContactEmail.toLowerCase() : null;
  }
  const oncallEmail = nullable(body.oncallEmail);
  if (oncallEmail !== undefined) {
    if (oncallEmail && !EMAIL_RE.test(oncallEmail.toLowerCase())) {
      return NextResponse.json(
        { error: "oncallEmail must be valid" },
        { status: 400 }
      );
    }
    data.oncallEmail = oncallEmail ? oncallEmail.toLowerCase() : null;
  }

  const websiteUrl = nullable(body.websiteUrl);
  if (websiteUrl !== undefined) {
    if (websiteUrl && !isHttpUrl(websiteUrl)) {
      return NextResponse.json({ error: "websiteUrl must be http(s)" }, { status: 400 });
    }
    data.websiteUrl = websiteUrl;
  }
  const documentationUrl = nullable(body.documentationUrl);
  if (documentationUrl !== undefined) {
    if (documentationUrl && !isHttpUrl(documentationUrl)) {
      return NextResponse.json(
        { error: "documentationUrl must be http(s)" },
        { status: 400 }
      );
    }
    data.documentationUrl = documentationUrl;
  }
  const webhookUrl = nullable(body.webhookUrl);
  if (webhookUrl !== undefined) {
    if (webhookUrl && !isHttpUrl(webhookUrl)) {
      return NextResponse.json({ error: "webhookUrl must be http(s)" }, { status: 400 });
    }
    data.webhookUrl = webhookUrl;
  }

  if (typeof body.published === "boolean") {
    data.published = body.published;
  }
  if (typeof body.adminSuspended === "boolean") {
    data.adminSuspended = body.adminSuspended;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await prisma.provider.update({ where: { id }, data });

  await writeAudit({
    actorUserId: actor.id,
    entityType: "provider",
    entityId: id,
    action: "provider.updated",
    previousValue: before,
    newValue: data
  });

  // Notify the provider when their visibility flags flip (published /
  // adminSuspended). Default ON; only an explicit notifyByEmail: false skips.
  const publishedChanged =
    typeof data.published === "boolean" && data.published !== beforePublished;
  const suspendedChanged =
    typeof data.adminSuspended === "boolean" &&
    data.adminSuspended !== beforeAdminSuspended;
  const notifyByEmail = body.notifyByEmail !== false;
  let emailNotified = false;
  if ((publishedChanged || suspendedChanged) && notifyByEmail) {
    const cfg = getConfig();
    const origin = getPublicOrigin(req);
    const newPublished =
      typeof data.published === "boolean" ? data.published : beforePublished;
    const newSuspended =
      typeof data.adminSuspended === "boolean"
        ? data.adminSuspended
        : beforeAdminSuspended;
    const visibilityLabel = newSuspended
      ? "Hidden — admin suspended"
      : newPublished
        ? "Published — visible in the public registry"
        : "Unpublished — not yet visible";
    const summary =
      typeof body.visibilityChangeReason === "string" &&
      body.visibilityChangeReason.trim() !== ""
        ? body.visibilityChangeReason.trim()
        : `An administrator updated the visibility of your organisation on ${cfg.registryName}.`;
    const recipients = uniqueValidEmails([
      target.contactEmail,
      target.legalContactEmail
    ]);
    if (recipients.length > 0) {
      const tmpl = emailTemplates.providerVisibilityChanged({
        registryName: cfg.registryName,
        providerDisplayName: target.displayName,
        visibilityLabel,
        summary,
        portalSettingsUrl: `${origin}/provider/settings`
      });
      sendTransactionalEmailAll("provider_visibility", recipients, (to) => ({
        to,
        subject: tmpl.subject,
        text: tmpl.text
      }));
      emailNotified = true;
    }
  }

  return NextResponse.json({ ok: true, emailNotified });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const provider = await prisma.provider.findUnique({
    where: { id },
    select: {
      slug: true,
      displayName: true,
      _count: {
        select: {
          resources: true,
          users: true,
          trustSignals: true,
          reviews: true,
          complaints: true,
          enforcementActions: true
        }
      }
    }
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const blockers = Object.entries(provider._count).filter(([, n]) => n > 0);
  if (blockers.length > 0) {
    return NextResponse.json(
      {
        error: "Provider still has dependent rows. Suspend instead of delete.",
        detail: blockers.map(([k, n]) => `${k}=${n}`).join(", ")
      },
      { status: 409, headers: { "content-type": "application/problem+json" } }
    );
  }

  try {
    await prisma.provider.delete({ where: { id } });
  } catch (e) {
    return NextResponse.json(
      { error: "Delete failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 409 }
    );
  }

  await writeAudit({
    actorUserId: actor.id,
    entityType: "provider",
    entityId: id,
    action: "provider.deleted",
    previousValue: { slug: provider.slug, displayName: provider.displayName }
  });

  return NextResponse.json({ ok: true });
}
