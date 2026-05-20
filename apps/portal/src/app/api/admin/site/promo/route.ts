import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { updatePromoBanner } from "@airegistry/core/services/public-cms";

function adminOnly(user: { roles: string[] } | null) {
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  return null;
}

type Payload = {
  enabled?: unknown;
  heading?: unknown;
  body?: unknown;
  ctaLabel?: unknown;
  ctaHref?: unknown;
};

function strOrNull(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * PUT update — full overwrite of the singleton. PUT (not PATCH) because
 * the form always sends every field; null-clearing is intentional.
 */
export async function PUT(req: Request) {
  const actor = await getCurrentUser();
  const guard = adminOnly(actor);
  if (guard) return guard;

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) required" }, { status: 400 });
  }

  await updatePromoBanner({
    actorUserId: actor!.id,
    enabled: body.enabled,
    heading: strOrNull(body.heading),
    body: strOrNull(body.body),
    ctaLabel: strOrNull(body.ctaLabel),
    ctaHref: strOrNull(body.ctaHref)
  });

  return NextResponse.json({ ok: true });
}
