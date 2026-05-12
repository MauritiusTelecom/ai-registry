/**
 * Outbound email - the Phase 2 envelope.
 *
 * The Phase 2 deliverable does NOT mandate a real SMTP integration; the dev
 * fallback writes the message body (including any verification or reset
 * URL) to stdout. This is the "log link when SMTP absent" behaviour from
 * tasks.md T013.
 *
 * If `SMTP_HOST` and `SMTP_PORT` are configured, the helper attempts to
 * dynamic-import `nodemailer` and send. The dependency is loaded lazily so
 * the module remains optional - operators who never configure SMTP do not
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
    // Dev fallback - log the body so the developer can copy any verification
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

/**
 * Lightweight `{placeholder}` substitution for env-driven email templates.
 *
 * Operators set subjects / bodies in .env (e.g. PUBLIC_REPORT_ACK_BODY) using
 * `{registryName}`, `{complaintId}`, etc. — this helper replaces each
 * occurrence with the matching value. Unknown placeholders render as empty
 * strings so a typo in .env doesn't leak the placeholder name into a sent
 * email.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
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
        `- ${opts.registryName}`
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
        `- ${opts.registryName}`
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
      subject: `We received your message - ${opts.registryName}`,
      text:
        `Hi ${opts.senderName},\n\n` +
        `${opts.replyIntro}\n\n` +
        `Topic: ${opts.topicLabel}\n\n` +
        `Confirm this email address (required before we treat the thread as verified):\n\n` +
        `  ${opts.verifyUrl}\n\n` +
        `The link expires in 24 hours. If you did not use the contact form on ${opts.registryName}, you can ignore this email.\n\n` +
        `- ${opts.operatorName} · ${opts.registryName}`
    };
  },
  passwordChanged(opts: { name: string; registryName: string; loginUrl: string }): {
    subject: string;
    text: string;
  } {
    return {
      subject: `Your ${opts.registryName} password was changed`,
      text:
        `Hi ${opts.name},\n\n` +
        `The password for your ${opts.registryName} account was just changed.\n\n` +
        `If this was you, no action is needed. Sign in anytime:\n\n` +
        `  ${opts.loginUrl}\n\n` +
        `If you did not change your password, reset it immediately from the sign-in page.\n\n` +
        `- ${opts.registryName}`
    };
  },
  resourceSubmittedForReview(opts: {
    registryName: string;
    resourceTitle: string;
    reviewId: string;
    portalResourcesUrl: string;
    portalReviewsUrl: string;
  }): { subject: string; text: string } {
    return {
      subject: `Submitted for review - ${opts.resourceTitle}`,
      text:
        `${opts.registryName}: a resource was submitted for sovereignty review.\n\n` +
        `Resource: ${opts.resourceTitle}\n` +
        `Review id: ${opts.reviewId}\n\n` +
        `View resources:\n  ${opts.portalResourcesUrl}\n\n` +
        `Track reviews:\n  ${opts.portalReviewsUrl}\n\n` +
        `- ${opts.registryName}`
    };
  },
  reviewDecision(opts: {
    registryName: string;
    providerDisplayName: string;
    resourceTitle: string;
    decisionLabel: string;
    decisionSummary: string;
    portalReviewsUrl: string;
    publicCatalogUrl?: string;
  }): { subject: string; text: string } {
    const listed =
      opts.publicCatalogUrl !== undefined
        ? `\nPublic catalog entry:\n  ${opts.publicCatalogUrl}\n`
        : "";
    return {
      subject: `Review update - ${opts.resourceTitle}`,
      text:
        `Hello ${opts.providerDisplayName},\n\n` +
        `${opts.registryName} has updated the sovereignty review for "${opts.resourceTitle}".\n\n` +
        `Outcome: ${opts.decisionLabel}\n\n` +
        `Summary:\n${opts.decisionSummary}\n\n` +
        `Open your provider reviews:\n  ${opts.portalReviewsUrl}\n` +
        listed +
        `\n- ${opts.registryName}`
    };
  },
  providerVerificationUpdate(opts: {
    registryName: string;
    providerDisplayName: string;
    statusLabel: string;
    summary: string;
    publicNote: string | null;
    portalSettingsUrl: string;
  }): { subject: string; text: string } {
    const note =
      opts.publicNote !== null && opts.publicNote.trim() !== ""
        ? `\nNote from the operator:\n${opts.publicNote}\n`
        : "";
    return {
      subject: `Provider verification update - ${opts.registryName}`,
      text:
        `Hello ${opts.providerDisplayName},\n\n` +
        `Your organisation's verification status on ${opts.registryName} is now: ${opts.statusLabel}.\n\n` +
        `Summary:\n${opts.summary}\n` +
        note +
        `\nProvider settings:\n  ${opts.portalSettingsUrl}\n\n` +
        `- ${opts.registryName}`
    };
  },
  complaintReceivedComplainant(opts: {
    registryName: string;
    operatorName: string;
    complaintId: string;
    contactUrl: string;
  }): { subject: string; text: string } {
    return {
      subject: `Complaint received - ${opts.registryName}`,
      text:
        `Thank you for contacting ${opts.registryName}.\n\n` +
        `We recorded your complaint (reference: ${opts.complaintId}). ` +
        `${opts.operatorName} will handle it according to our process.\n\n` +
        `You can reach us again via:\n  ${opts.contactUrl}\n\n` +
        `- ${opts.operatorName} · ${opts.registryName}`
    };
  },
  complaintReceivedOperator(opts: {
    registryName: string;
    complaintId: string;
    complaintType: string;
    severity: string;
    targetSummary: string;
    adminHomeUrl: string;
  }): { subject: string; text: string } {
    return {
      subject: `[${opts.registryName}] New complaint ${opts.complaintId}`,
      text:
        `A new public complaint was filed.\n\n` +
        `Id: ${opts.complaintId}\n` +
        `Type: ${opts.complaintType}\n` +
        `Severity: ${opts.severity}\n` +
        `Target: ${opts.targetSummary}\n\n` +
        `Open the admin console:\n  ${opts.adminHomeUrl}\n\n` +
        `- ${opts.registryName} (automated)`
    };
  }
};
