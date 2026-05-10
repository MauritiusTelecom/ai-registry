import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/write-audit";
import { isHttpUrl } from "@/lib/validators";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * PATCH /api/admin/providers/:id — edit profile fields. Slug + statusId are
 *   immutable via this route (use `/verify` for status, slug is hard-pinned).
 * DELETE /api/admin/providers/:id — hard delete; refused when the provider
 *   has any resources, users, audit references, or trust signals attached.
 *
 * See `ai-registry-specs/shared/admin-crud.md` §5.2.
 */

type Body = {
  displayName?: unknown;
  typeCode?: unknown;
  jurisdictionCode?: unknown;
  contactEmail?: unknown;
  legalName?: unknown | null;
  registrationNumber?: unknown | null;
  websiteUrl?: unknown | null;
  description?: unknown | null;
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

  const data: Record<string, unknown> = {};
  const before = {
    displayName: target.displayName,
    contactEmail: target.contactEmail,
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
  const websiteUrl = nullable(body.websiteUrl);
  if (websiteUrl !== undefined) {
    if (websiteUrl && !isHttpUrl(websiteUrl)) {
      return NextResponse.json({ error: "websiteUrl must be http(s)" }, { status: 400 });
    }
    data.websiteUrl = websiteUrl;
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

  return NextResponse.json({ ok: true });
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
