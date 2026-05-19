import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, sep } from "node:path";
import {
  getCurrentUser,
  setAdminBrandingAsset,
  clearAdminBrandingAsset
} from "@airegistry/sdk/server";
import type { AdminBrandingAssetSlot } from "@airegistry/sdk/server";
import { invalidateBrandingCache } from "@/lib/branding";

const MAX_BYTES = 1_000_000; // 1 MB
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp"
};

/**
 * Two upload slots share this route:
 *   - "logo"   → SiteBranding.logoUrl, filename prefix `logo-`
 *   - "hero"   → SiteBranding.heroEyebrowIconUrl, filename prefix `hero-`
 * Slot is read from a `slot` query param (defaults to "logo" for backward
 * compat with the original logo-only callers).
 */

const SLOT_PREFIXES: Record<AdminBrandingAssetSlot, string> = {
  logo: "logo",
  hero: "hero"
};

function parseSlot(req: Request): AdminBrandingAssetSlot {
  const url = new URL(req.url);
  const raw = url.searchParams.get("slot");
  return raw === "hero" ? "hero" : "logo";
}

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

  const slot = parseSlot(req);

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

  // Hash the bytes so the public URL changes whenever the asset changes -
  // browser caches reliably refetch without an explicit cache-buster.
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const filename = `${SLOT_PREFIXES[slot]}-${hash}.${ext}`;
  const dir = join(process.cwd(), "public", "branding");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), bytes);
  const publicPath = `/branding/${filename}`;

  const { previousPath } = await setAdminBrandingAsset(actor!.id, slot, publicPath, {
    sizeBytes: bytes.byteLength,
    mimeType: file.type
  });

  // Best-effort cleanup of the previous file. Skip if it points outside the
  // branding dir or doesn't exist.
  if (previousPath && previousPath !== publicPath && previousPath.startsWith("/branding/")) {
    const prev = join(dir, previousPath.slice("/branding/".length));
    if (prev.startsWith(dir + sep)) {
      try { await unlink(prev); } catch { /* ignore */ }
    }
  }

  invalidateBrandingCache();

  return NextResponse.json({ ok: true, slot, url: publicPath });
}

export async function DELETE(req: Request) {
  const actor = await getCurrentUser();
  const guard = adminOnly(actor);
  if (guard) return guard;

  const slot = parseSlot(req);
  const { previousPath } = await clearAdminBrandingAsset(actor!.id, slot);

  if (previousPath?.startsWith("/branding/")) {
    const dir = join(process.cwd(), "public", "branding");
    const prev = join(dir, previousPath.slice("/branding/".length));
    if (prev.startsWith(dir + sep)) {
      try { await unlink(prev); } catch { /* ignore */ }
    }
  }

  invalidateBrandingCache();
  return NextResponse.json({ ok: true, slot });
}
