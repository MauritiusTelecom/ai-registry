import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/write-audit";
import { isHttpUrl } from "@/lib/validators";

/**
 * PATCH /api/admin/resources/:id - edit metadata fields. Lifecycle changes
 *   live on the dedicated `/transition` action route. Slug + provider are
 *   immutable post-create.
 * DELETE /api/admin/resources/:id - only when the resource has zero
 *   governance footprint (no AIR-ID issued, no review history). Use the
 *   `remove` transition for a graceful tombstone.
 *
 * See `ai-registry-specs/shared/admin-crud.md` §5.1.
 */

type Body = {
  title?: unknown;
  shortDescription?: unknown;
  longDescription?: unknown | null;
  riskCode?: unknown;
  versionLabel?: unknown | null;
  license?: unknown | null;
  documentationUrl?: unknown | null;
  sourceCodeUrl?: unknown | null;
  termsUrl?: unknown | null;
};

function nullable(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? null : t;
}

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

  const target = await prisma.resource.findUnique({
    where: { id },
    include: { riskLevel: { select: { code: true } } }
  });
  if (!target) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  const before: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t.length < 2) {
      return NextResponse.json({ error: "title too short" }, { status: 400 });
    }
    if (t !== target.title) {
      data.title = t;
      before.title = target.title;
    }
  }
  if (typeof body.shortDescription === "string") {
    const t = body.shortDescription.trim();
    if (t.length < 8) {
      return NextResponse.json(
        { error: "shortDescription must be ≥ 8 chars" },
        { status: 400 }
      );
    }
    data.shortDescription = t;
    before.shortDescription = target.shortDescription;
  }

  const longDescription = nullable(body.longDescription);
  if (longDescription !== undefined) data.longDescription = longDescription;

  if (typeof body.riskCode === "string" && body.riskCode.trim() !== "") {
    const code = body.riskCode.trim().toLowerCase();
    if (code !== target.riskLevel.code) {
      const r = await prisma.riskLevel.findUnique({ where: { code } });
      if (!r) return NextResponse.json({ error: "Unknown riskCode" }, { status: 400 });
      data.riskLevelId = r.id;
      before.risk = target.riskLevel.code;
    }
  }

  const versionLabel = nullable(body.versionLabel);
  if (versionLabel !== undefined) data.versionLabel = versionLabel;
  const license = nullable(body.license);
  if (license !== undefined) data.license = license;

  const docUrl = nullable(body.documentationUrl);
  if (docUrl !== undefined) {
    if (docUrl && !isHttpUrl(docUrl)) {
      return NextResponse.json({ error: "documentationUrl must be http(s)" }, { status: 400 });
    }
    data.documentationUrl = docUrl;
  }
  const srcUrl = nullable(body.sourceCodeUrl);
  if (srcUrl !== undefined) {
    if (srcUrl && !isHttpUrl(srcUrl)) {
      return NextResponse.json({ error: "sourceCodeUrl must be http(s)" }, { status: 400 });
    }
    data.sourceCodeUrl = srcUrl;
  }
  const termsUrl = nullable(body.termsUrl);
  if (termsUrl !== undefined) {
    if (termsUrl && !isHttpUrl(termsUrl)) {
      return NextResponse.json({ error: "termsUrl must be http(s)" }, { status: 400 });
    }
    data.termsUrl = termsUrl;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await prisma.resource.update({ where: { id }, data });

  await writeAudit({
    actorUserId: actor.id,
    entityType: "resource",
    entityId: id,
    action: "resource.updated",
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
  const target = await prisma.resource.findUnique({
    where: { id },
    select: {
      slug: true,
      title: true,
      airId: true,
      _count: {
        select: {
          reviews: true,
          trustSignals: true,
          complaints: true,
          enforcementActions: true
        }
      }
    }
  });
  if (!target) return NextResponse.json({ error: "Resource not found" }, { status: 404 });

  const blockers = Object.entries(target._count).filter(([, n]) => n > 0);
  if (target.airId || blockers.length > 0) {
    return NextResponse.json(
      {
        error:
          "Resource has governance footprint. Use the `remove` transition to tombstone it instead.",
        detail:
          (target.airId ? `airId=${target.airId}; ` : "") +
          blockers.map(([k, n]) => `${k}=${n}`).join(", ")
      },
      { status: 409, headers: { "content-type": "application/problem+json" } }
    );
  }

  try {
    await prisma.resource.delete({ where: { id } });
  } catch (e) {
    return NextResponse.json(
      { error: "Delete failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 409 }
    );
  }

  await writeAudit({
    actorUserId: actor.id,
    entityType: "resource",
    entityId: id,
    action: "resource.deleted",
    previousValue: { slug: target.slug, title: target.title }
  });

  return NextResponse.json({ ok: true });
}
