import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/write-audit";
import { invalidateBrandingCache } from "@/lib/branding";

const SINGLETON_ID = "default";

function adminOnly(user: { roles: string[] } | null) {
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const actor = await getCurrentUser();
  const guard = adminOnly(actor);
  if (guard) return guard;

  const row = await prisma.siteBranding.findUnique({
    where: { id: SINGLETON_ID }
  });
  return NextResponse.json({
    registryName: row?.registryName ?? null,
    logoUrl: row?.logoUrl ?? null,
    copyrightLine: row?.copyrightLine ?? null,
    buildLine: row?.buildLine ?? null,
    heroEyebrowText: row?.heroEyebrowText ?? null,
    heroEyebrowIconUrl: row?.heroEyebrowIconUrl ?? null,
    updatedAt: row?.updatedAt?.toISOString() ?? null
  });
}

type PatchPayload = {
  registryName?: string | null;
  copyrightLine?: string | null;
  buildLine?: string | null;
  heroEyebrowText?: string | null;
};

function clean(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") return undefined as unknown as string | null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function PATCH(req: Request) {
  const actor = await getCurrentUser();
  const guard = adminOnly(actor);
  if (guard) return guard;

  let body: PatchPayload;
  try {
    body = (await req.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, string | null> = {};
  if ("registryName" in body) {
    const v = clean(body.registryName);
    if (v !== undefined) data.registryName = v;
  }
  if ("copyrightLine" in body) {
    const v = clean(body.copyrightLine);
    if (v !== undefined) data.copyrightLine = v;
  }
  if ("buildLine" in body) {
    const v = clean(body.buildLine);
    if (v !== undefined) data.buildLine = v;
  }
  if ("heroEyebrowText" in body) {
    const v = clean(body.heroEyebrowText);
    if (v !== undefined) data.heroEyebrowText = v;
  }

  const before = await prisma.siteBranding.findUnique({ where: { id: SINGLETON_ID } });
  const updated = await prisma.siteBranding.upsert({
    where: { id: SINGLETON_ID },
    update: { ...data, updatedById: actor!.id },
    create: { id: SINGLETON_ID, ...data, updatedById: actor!.id }
  });

  invalidateBrandingCache();

  await writeAudit({
    actorUserId: actor!.id,
    entityType: "site_branding",
    entityId: SINGLETON_ID,
    action: "branding.updated",
    previousValue: before
      ? {
          registryName: before.registryName,
          copyrightLine: before.copyrightLine,
          buildLine: before.buildLine,
          heroEyebrowText: before.heroEyebrowText
        }
      : null,
    newValue: {
      registryName: updated.registryName,
      copyrightLine: updated.copyrightLine,
      buildLine: updated.buildLine,
      heroEyebrowText: updated.heroEyebrowText
    }
  });

  return NextResponse.json({ ok: true });
}
