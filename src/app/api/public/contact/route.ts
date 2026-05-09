import { NextResponse } from "next/server";

// Phase 0 stub: validate the shape of contact submissions and log them.
// Persistence + email routing land alongside the operator notification work.

const TOPICS = new Set([
  "general",
  "submit",
  "review",
  "report",
  "jurisdiction",
  "press"
]);

type ContactPayload = {
  name?: string;
  org?: string;
  email?: string;
  topic?: string;
  message?: string;
};

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^\S+@\S+\.\S+$/.test(value);
}

export async function POST(req: Request) {
  let payload: ContactPayload;
  try {
    payload = (await req.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors: string[] = [];
  if (!payload.name || payload.name.trim().length < 2) errors.push("name is required");
  if (!payload.org || payload.org.trim().length < 2) errors.push("org is required");
  if (!isEmail(payload.email)) errors.push("email must be valid");
  if (!payload.topic || !TOPICS.has(payload.topic)) {
    errors.push("topic must be one of: " + [...TOPICS].join(", "));
  }
  if (!payload.message || payload.message.trim().length < 16) {
    errors.push("message must be at least 16 characters");
  }

  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  console.info(
    JSON.stringify({
      event: "public.contact.received",
      topic: payload.topic,
      messageLength: payload.message?.length ?? 0,
      ts: new Date().toISOString()
    })
  );

  return NextResponse.json({ accepted: true }, { status: 202 });
}
