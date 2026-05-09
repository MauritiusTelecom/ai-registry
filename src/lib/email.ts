/**
 * Outbound email — the Phase 2 envelope.
 *
 * The Phase 2 deliverable does NOT mandate a real SMTP integration; the dev
 * fallback writes the message body (including any verification or reset
 * URL) to stdout. This is the "log link when SMTP absent" behaviour from
 * tasks.md T013.
 *
 * If `SMTP_HOST` and `SMTP_PORT` are configured, the helper attempts to
 * dynamic-import `nodemailer` and send. The dependency is loaded lazily so
 * the module remains optional — operators who never configure SMTP do not
 * need `nodemailer` installed.
 */

import { getConfig } from "@/lib/config";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult =
  | { delivered: true; channel: "smtp" }
  | { delivered: false; channel: "console"; reason: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = getConfig();
  const { smtpHost, smtpPort, smtpUser, smtpPass, from } = cfg.mail;

  // Always log a structured summary so the audit/observability layer sees
  // the attempt, regardless of channel.
  console.info(
    JSON.stringify({
      event: "email.attempt",
      to: input.to,
      subject: input.subject,
      smtpConfigured: smtpHost !== null && smtpPort !== null,
      ts: new Date().toISOString()
    })
  );

  if (smtpHost === null || smtpPort === null) {
    // Dev fallback — log the body so the developer can copy any verification
    // / reset URL it contains.
    console.info("─── EMAIL (console fallback) ───");
    console.info(`From:    ${from}`);
    console.info(`To:      ${input.to}`);
    console.info(`Subject: ${input.subject}`);
    console.info(input.text);
    console.info("─── END EMAIL ───");
    return {
      delivered: false,
      channel: "console",
      reason: "SMTP_HOST or SMTP_PORT not configured."
    };
  }

  // SMTP path. Dynamic import keeps `nodemailer` optional. Failure falls
  // through to the console channel so a misconfiguration never breaks the
  // calling flow (registration, password reset, etc.).
  try {
    const nm: typeof import("nodemailer") = await import("nodemailer");
    const transport = nm.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
    });
    await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html
    });
    return { delivered: true, channel: "smtp" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn("email.smtp.failed", { reason });
    console.info("─── EMAIL (smtp failed, falling back to console) ───");
    console.info(`From:    ${from}`);
    console.info(`To:      ${input.to}`);
    console.info(`Subject: ${input.subject}`);
    console.info(input.text);
    console.info("─── END EMAIL ───");
    return { delivered: false, channel: "console", reason };
  }
}

/** Templates: keeping these inline so no separate templating engine is needed. */
export const emailTemplates = {
  verification(opts: { name: string; verifyUrl: string; registryName: string }): {
    subject: string;
    text: string;
  } {
    return {
      subject: `Verify your ${opts.registryName} account`,
      text:
        `Hi ${opts.name},\n\n` +
        `Welcome to ${opts.registryName}. Confirm your email address by opening this link:\n\n` +
        `  ${opts.verifyUrl}\n\n` +
        `The link expires in 24 hours. If you didn't request this, you can ignore this email.\n\n` +
        `— ${opts.registryName}`
    };
  },
  passwordReset(opts: { name: string; resetUrl: string; registryName: string }): {
    subject: string;
    text: string;
  } {
    return {
      subject: `Reset your ${opts.registryName} password`,
      text:
        `Hi ${opts.name},\n\n` +
        `We received a request to reset your ${opts.registryName} password. Open this link to set a new one:\n\n` +
        `  ${opts.resetUrl}\n\n` +
        `The link expires in 1 hour. If you didn't request this, ignore this email and your password will stay the same.\n\n` +
        `— ${opts.registryName}`
    };
  },
  /** Auto-reply after POST /api/public/contact; includes email-ownership verification link. */
  contactConfirmation(opts: {
    senderName: string;
    registryName: string;
    operatorName: string;
    topicLabel: string;
    replyIntro: string;
    verifyUrl: string;
  }): { subject: string; text: string } {
    return {
      subject: `We received your message — ${opts.registryName}`,
      text:
        `Hi ${opts.senderName},\n\n` +
        `${opts.replyIntro}\n\n` +
        `Topic: ${opts.topicLabel}\n\n` +
        `Confirm this email address (required before we treat the thread as verified):\n\n` +
        `  ${opts.verifyUrl}\n\n` +
        `The link expires in 24 hours. If you did not use the contact form on ${opts.registryName}, you can ignore this email.\n\n` +
        `— ${opts.operatorName} · ${opts.registryName}`
    };
  }
};
