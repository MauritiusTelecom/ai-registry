import { NextResponse } from "next/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { upsertFaqEntry } from "@airegistry/core/services/public-cms";

function adminOnly(user: { roles: string[] } | null) {
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  return null;
}

type Payload = {
  code?: unknown;
  question?: unknown;
  answer?: unknown;
  sortOrder?: unknown;
  active?: unknown;
};

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const CODE_RE = /^[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?$/;

/**
 * POST upsert. Body: { code, question, answer, sortOrder?, active? }.
 * `code` is the lookup key — required on create, must already exist on edit.
 * Idempotent: re-POSTing with the same `code` updates in place.
 */
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
  const question = str(body.question);
  const answer = str(body.answer);

  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
  if (!CODE_RE.test(code)) {
    return NextResponse.json(
      { error: "code must be lowercase letters, digits and hyphens (a-z0-9-)" },
      { status: 400 }
    );
  }
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });
  if (!answer) return NextResponse.json({ error: "answer required" }, { status: 400 });

  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? Math.max(0, Math.floor(body.sortOrder))
      : undefined;
  const active = typeof body.active === "boolean" ? body.active : undefined;

  await upsertFaqEntry({
    actorUserId: actor!.id,
    code,
    question,
    answer,
    sortOrder,
    active
  });

  return NextResponse.json({ ok: true });
}
