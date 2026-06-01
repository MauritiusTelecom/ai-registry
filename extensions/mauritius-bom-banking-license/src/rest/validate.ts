import { NextResponse } from "next/server";
import { checkBomLicenceFormat } from "@airegistry/extension-mauritius-bom-banking-license/lib/validate-bom-license";

export async function POST(req: Request) {
  let body: { licence?: string } = {};
  try {
    body = (await req.json()) as { licence?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.licence !== "string") {
    return NextResponse.json({ error: "licence is required" }, { status: 400 });
  }
  return NextResponse.json(checkBomLicenceFormat(body.licence));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.json(checkBomLicenceFormat(url.searchParams.get("licence") ?? ""));
}
