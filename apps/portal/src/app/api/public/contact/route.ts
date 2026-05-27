import { NextResponse } from "next/server";
import { Prisma } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@airegistry/sdk";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prepareEmailVerificationToken } from "@airegistry/sdk/server";
import { emailTemplates, sendEmail } from "@airegistry/sdk/server";
import { normalizeContactEmail } from "@airegistry/sdk";
import { CONTACT_TOPIC_LABELS, CONTACT_TOPICS, type ContactTopicCode } from "@airegistry/sdk";
import { getPublicOrigin } from "@/lib/public-origin";
import { writeAudit } from "@airegistry/sdk";
import { userExistsById, submitContactRecord } from "@airegistry/sdk/server";
import { enforceRateLimit } from "@/lib/rate-limit";

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

function prismaErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as Record<string, unknown>;
  if (typeof e.code === "string") return e.code;
  // PrismaClientInitializationError (e.g. P1000 auth) exposes `errorCode`, not `code`.
  if (typeof e.errorCode === "string") return e.errorCode;
  return undefined;
}

function verboseContactErrors(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.CONTACT_API_VERBOSE_ERRORS === "true" ||
    process.env.CONTACT_API_VERBOSE_ERRORS === "1"
  );
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "public-write");
  if (limited) return limited;

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
  if (!payload.topic || !CONTACT_TOPICS.has(payload.topic)) {
    errors.push("topic must be one of: " + [...CONTACT_TOPICS].join(", "));
  }
  if (!payload.message || payload.message.trim().length < 16) {
    errors.push("message must be at least 16 characters");
  }

  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  const email = normalizeContactEmail(payload.email as string);
  const senderName = (payload.name as string).trim();
  const organisationName = (payload.org as string).trim();
  const topic = payload.topic as ContactTopicCode;
  const message = (payload.message as string).trim();
  const topicLabel = CONTACT_TOPIC_LABELS[topic];

  let linkToUserId: string | null = null;
  try {
    const sessionUser = await getCurrentUser();
    if (sessionUser && normalizeContactEmail(sessionUser.email) === email) {
      if (await userExistsById(sessionUser.id)) {
        linkToUserId = sessionUser.id;
      }
    }
  } catch {
    // Anonymous submit must succeed even if session resolution hits a DB glitch.
    linkToUserId = null;
  }

  const { rawToken: rawVerify, hashedToken: tokenHash, expiry: tokenExpiry } = prepareEmailVerificationToken();

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  let contactId: string;
  let linkedForAudit: string | null = null;
  try {
    const createData = {
      senderName,
      organisationName,
      email,
      topic,
      message,
      emailVerified: false,
      emailVerificationToken: tokenHash,
      emailVerificationExpiry: tokenExpiry,
      linkedUserId: linkToUserId,
      ipAddress,
      userAgent
    };

    const result = await submitContactRecord({
      senderName: createData.senderName,
      organisationName: createData.organisationName,
      email: createData.email,
      topic: createData.topic,
      message: createData.message,
      emailVerificationTokenHash: createData.emailVerificationToken!,
      emailVerificationExpiry: createData.emailVerificationExpiry!,
      linkedUserId: createData.linkedUserId,
      ipAddress: createData.ipAddress,
      userAgent: createData.userAgent
    });
    contactId = result.id;
    linkedForAudit = result.linkedUserId;
  } catch (error) {
    console.error("public.contact.persist_failed", error);

    let message = "Could not save your message. Please try again later.";
    const code = prismaErrorCode(error);
    if (code === "P1000" || error instanceof Prisma.PrismaClientInitializationError) {
      message =
        "Database authentication failed (P1000). Fix DATABASE_URL in ai-registry/.env - use a real PostgreSQL user and password (not the USER/PASSWORD placeholders), then restart `npm run dev`.";
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === "P2021" ||
        /relation.*"Contacts"|table.*"Contacts"|relation.*contacts|table.*contacts/i.test(
          error.message ?? ""
        )
      ) {
        message =
          "Contact storage is not initialised on this database. Run `npm run prisma:migrate` (or `npx prisma db push`) from the ai-registry project, then retry.";
      } else if (error.code === "P1001") {
        message = "Cannot reach the database. Check DATABASE_URL and that PostgreSQL is running.";
      } else if (error.code === "P2003") {
        message =
          "Could not link this submission to your account (invalid session). Try signing out and submitting again, or use a private window.";
      }
    }

    if (code) message = `${message} (${code})`;

    const body: { error: string; prismaCode?: string; devMessage?: string } = { error: message };
    if (code) body.prismaCode = code;
    if (verboseContactErrors() && error instanceof Error) {
      body.devMessage = error.message;
    }

    return NextResponse.json(body, { status: 503 });
  }

  try {
    await writeAudit({
      actorUserId: linkedForAudit,
      entityType: "contact",
      entityId: contactId,
      action: "contact.created",
      newValue: {
        email,
        topic,
        senderName,
        organisationName,
        messageLength: message.length,
        linkedUserId: linkedForAudit
      },
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error("public.contact.audit_log_failed", { contactId, error });
  }

  const cfg = getConfig();
  const origin = getPublicOrigin(req);
  const verifyUrl = `${origin}/contact/verify?token=${encodeURIComponent(rawVerify)}`;
  const tmpl = emailTemplates.contactConfirmation({
    senderName,
    registryName: cfg.registryName,
    operatorName: cfg.operatorName,
    topicLabel,
    replyIntro: cfg.contactFormReplyMessage,
    verifyUrl
  });

  let emailSent = true;
  try {
    await sendEmail({ to: email, subject: tmpl.subject, text: tmpl.text });
  } catch (error) {
    emailSent = false;
    console.error("public.contact.email_failed", { contactId, error });
  }

  console.info(
    JSON.stringify({
      event: "public.contact.received",
      topic,
      contactId,
      messageLength: message.length,
      emailSent,
      ts: new Date().toISOString()
    })
  );

  const acknowledgedAt = new Date().toISOString();
  return NextResponse.json(
    {
      ticketId: contactId,
      acknowledgedAt,
      ...(emailSent ? {} : { emailWarning: "Message saved but confirmation email could not be sent. Check server logs / SMTP." })
    },
    { status: 202 }
  );
}
