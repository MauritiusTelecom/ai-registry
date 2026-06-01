import { NextResponse } from "next/server";
import { checkBrnFormat } from "@airegistry/extension-mauritius-brn-check/lib/validate-brn";

/**
 * POST /api/ext/mu-brn-check/validate  -- body: { brn: "C12345678" }
 * GET  /api/ext/mu-brn-check/validate?brn=C12345678
 *
 * Pure format check. The "is this a real registered company" verdict
 * lives elsewhere (manual admin verification via /admin/brn-pending).
 */

export async function POST(req: Request) {
  let body: { brn?: string } = {};
  try {
    body = (await req.json()) as { brn?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.brn !== "string") {
    return NextResponse.json({ error: "brn is required" }, { status: 400 });
  }
  return NextResponse.json(checkBrnFormat(body.brn));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const brn = url.searchParams.get("brn") ?? "";
  return NextResponse.json(checkBrnFormat(brn));
}
