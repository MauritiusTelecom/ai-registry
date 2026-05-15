import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, sep } from "node:path";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/write-audit";
import { invalidateBrandingCache } from "@/lib/branding";

const SINGLETON_ID = "default";
const MAX_BYTES = 1_000_000; // 1 MB
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp"
};

function adminOnly(user: { roles: string[] } | null) {
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  return null;
}

export async function POST(req: Request) {
  const actor = await getCurrentUser();
  const guard = adminOnly(actor);
  if (guard) return guard;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported image type. Use PNG, JPEG, SVG, or WebP." },
      { status: 400 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 1 MB limit" }, { status: 400 });
  }

  // Hash the bytes so the public URL changes whenever the logo changes -
  // browser caches reliably refetch without an explicit cache-buster.
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const filename = `logo-${hash}.${ext}`;
  const dir = join(process.cwd(), "public", "branding");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), bytes);
  const publicPath = `/branding/${filename}`;

  const before = await prisma.siteBranding.findUnique({ where: { id: SINGLETON_ID } });
  const updated = await prisma.siteBranding.upsert({
    where: { id: SINGLETON_ID },
    update: { logoUrl: publicPath, updatedById: actor!.id },
    create: { id: SINGLETON_ID, logoUrl: publicPath, updatedById: actor!.id }
  });

  // Best-effort cleanup of the previous file. Skip if it points outside the
  // branding dir or doesn't exist.
  if (before?.logoUrl && before.logoUrl !== publicPath && before.logoUrl.startsWith("/branding/")) {
    const prev = join(dir, before.logoUrl.slice("/branding/".length));
    if (prev.startsWith(dir + sep)) {
      try { await unlink(prev); } catch { /* ignore */ }
    }
  }

  invalidateBrandingCache();

  await writeAudit({
    actorUserId: actor!.id,
    entityType: "site_branding",
    entityId: SINGLETON_ID,
    action: "branding.logo_uploaded",
    previousValue: before ? { logoUrl: before.logoUrl } : null,
    newValue: { logoUrl: updated.logoUrl, sizeBytes: bytes.byteLength, mimeType: file.type }
  });

  return NextResponse.json({ ok: true, logoUrl: publicPath });
}

export async function DELETE() {
  const actor = await getCurrentUser();
  const guard = adminOnly(actor);
  if (guard) return guard;

  const before = await prisma.siteBranding.findUnique({ where: { id: SINGLETON_ID } });
  await prisma.siteBranding.upsert({
    where: { id: SINGLETON_ID },
    update: { logoUrl: null, updatedById: actor!.id },
    create: { id: SINGLETON_ID, logoUrl: null, updatedById: actor!.id }
  });

  if (before?.logoUrl?.startsWith("/branding/")) {
    const dir = join(process.cwd(), "public", "branding");
    const prev = join(dir, before.logoUrl.slice("/branding/".length));
    if (prev.startsWith(dir + sep)) {
      try { await unlink(prev); } catch { /* ignore */ }
    }
  }

  invalidateBrandingCache();

  await writeAudit({
    actorUserId: actor!.id,
    entityType: "site_branding",
    entityId: SINGLETON_ID,
    action: "branding.logo_cleared",
    previousValue: before ? { logoUrl: before.logoUrl } : null,
    newValue: { logoUrl: null }
  });

  return NextResponse.json({ ok: true });
}
