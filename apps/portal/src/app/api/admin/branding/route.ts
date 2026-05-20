import { NextResponse } from "next/server";
import {
  getCurrentUser,
  loadAdminBrandingFull,
  updateAdminBrandingFields
} from "@airegistry/sdk/server";
import { invalidateBrandingCache } from "@/lib/branding";

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

  const view = await loadAdminBrandingFull();
  return NextResponse.json(view);
}

type PatchPayload = {
  registryName?: string | null;
  copyrightLine?: string | null;
  buildLine?: string | null;
  heroEyebrowText?: string | null;
  operatorName?: string | null;
  operatorContactEmail?: string | null;
  operatorOfficeName?: string | null;
  operatorOfficeAddress?: string | null;
  operatorContactHours?: string | null;
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
  if ("operatorName" in body) {
    const v = clean(body.operatorName);
    if (v !== undefined) data.operatorName = v;
  }
  if ("operatorContactEmail" in body) {
    const v = clean(body.operatorContactEmail);
    if (v !== undefined) data.operatorContactEmail = v;
  }
  if ("operatorOfficeName" in body) {
    const v = clean(body.operatorOfficeName);
    if (v !== undefined) data.operatorOfficeName = v;
  }
  if ("operatorOfficeAddress" in body) {
    const v = clean(body.operatorOfficeAddress);
    if (v !== undefined) data.operatorOfficeAddress = v;
  }
  if ("operatorContactHours" in body) {
    const v = clean(body.operatorContactHours);
    if (v !== undefined) data.operatorContactHours = v;
  }

  await updateAdminBrandingFields(actor!.id, data);
  invalidateBrandingCache();
  return NextResponse.json({ ok: true });
}
