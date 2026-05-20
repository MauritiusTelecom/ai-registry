import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { upsertHowItWorksStep } from "@airegistry/core/services/public-cms";

function adminOnly(user: { roles: string[] } | null) {
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  return null;
}

type Payload = {
  code?: unknown;
  title?: unknown;
  description?: unknown;
  stepNumber?: unknown;
  highlight?: unknown;
  sortOrder?: unknown;
  active?: unknown;
};

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const CODE_RE = /^[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?$/;

export async function POST(req: Request) {
  const actor = await getCurrentUser();
  const guard = adminOnly(actor);
  if (guard) return guard;

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = str(body.code);
  const title = str(body.title);
  const description = str(body.description);

  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "code must be lowercase letters, digits and hyphens" }, { status: 400 });
  }
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "description required" }, { status: 400 });

  const stepNumber =
    typeof body.stepNumber === "number" && Number.isFinite(body.stepNumber)
      ? Math.max(1, Math.floor(body.stepNumber))
      : 1;
  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? Math.max(0, Math.floor(body.sortOrder))
      : undefined;
  const highlight = typeof body.highlight === "boolean" ? body.highlight : undefined;
  const active = typeof body.active === "boolean" ? body.active : undefined;

  await upsertHowItWorksStep({
    actorUserId: actor!.id,
    code,
    title,
    description,
    stepNumber,
    highlight,
    sortOrder,
    active
  });

  return NextResponse.json({ ok: true });
}
