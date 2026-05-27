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

import { getConfig, type RegistryConfig } from "./config";

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
  const { smtpHost, smtpPort, smtpUser, smtpPass, from, testInbox } = cfg.mail;

  // QA redirect — when TEST_EMAIL_INBOX is configured, override the
  // recipient and tag the subject so the operator can verify every
  // production email path against a single inbox without touching real
  // user mailboxes. The original recipient is preserved in the subject
  // line so multi-recipient runs (e.g. a provider with two contacts)
  // remain distinguishable.
  const intendedTo = input.to;
  if (testInbox !== null) {
    input = {
      ...input,
      to: testInbox,
      subject: `[orig: ${intendedTo}] ${input.subject}`
    };
  }

  // Always log a structured summary so the audit/observability layer sees
  // the attempt, regardless of channel.
  console.info(
    JSON.stringify({
      event: "email.attempt",
      to: input.to,
      intendedTo,
      redirected: testInbox !== null,
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

/**
 * Render the configured template pair (subject + body) for a given
 * transactional email. Pulls subject/body strings from
 * `getConfig().emailTemplates` so operators can override every wording
 * through .env without code changes.
 */
function renderConfigured(
  key: keyof RegistryConfig["emailTemplates"],
  vars: Record<string, string>
): { subject: string; text: string } {
  const tpl = getConfig().emailTemplates[key];
  return {
    subject: renderTemplate(tpl.subject, vars),
    text: renderTemplate(tpl.body, vars)
  };
}

/** Templates: all subject/body strings come from .env (see config.ts). */
export const emailTemplates = {
  verification(opts: { name: string; verifyUrl: string; registryName: string }): {
    subject: string;
    text: string;
  } {
    return renderConfigured("verification", {
      name: opts.name,
      verifyUrl: opts.verifyUrl,
      registryName: opts.registryName
    });
  },
  passwordReset(opts: { name: string; resetUrl: string; registryName: string }): {
    subject: string;
    text: string;
  } {
    return renderConfigured("passwordReset", {
      name: opts.name,
      resetUrl: opts.resetUrl,
      registryName: opts.registryName
    });
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
    return renderConfigured("contactConfirmation", {
      senderName: opts.senderName,
      registryName: opts.registryName,
      operatorName: opts.operatorName,
      topicLabel: opts.topicLabel,
      replyIntro: opts.replyIntro,
      verifyUrl: opts.verifyUrl
    });
  },
  passwordChanged(opts: { name: string; registryName: string; loginUrl: string }): {
    subject: string;
    text: string;
  } {
    return renderConfigured("passwordChanged", {
      name: opts.name,
      registryName: opts.registryName,
      loginUrl: opts.loginUrl
    });
  },
  resourceSubmittedForReview(opts: {
    registryName: string;
    resourceTitle: string;
    reviewId: string;
    portalResourcesUrl: string;
    portalReviewsUrl: string;
  }): { subject: string; text: string } {
    return renderConfigured("resourceSubmittedForReview", {
      registryName: opts.registryName,
      resourceTitle: opts.resourceTitle,
      reviewId: opts.reviewId,
      portalResourcesUrl: opts.portalResourcesUrl,
      portalReviewsUrl: opts.portalReviewsUrl
    });
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
    const publicCatalogBlock =
      opts.publicCatalogUrl !== undefined
        ? `\nPublic catalog entry:\n  ${opts.publicCatalogUrl}\n`
        : "";
    return renderConfigured("reviewDecision", {
      registryName: opts.registryName,
      providerDisplayName: opts.providerDisplayName,
      resourceTitle: opts.resourceTitle,
      decisionLabel: opts.decisionLabel,
      decisionSummary: opts.decisionSummary,
      portalReviewsUrl: opts.portalReviewsUrl,
      publicCatalogUrl: opts.publicCatalogUrl ?? "",
      publicCatalogBlock
    });
  },
  providerVerificationUpdate(opts: {
    registryName: string;
    providerDisplayName: string;
    statusLabel: string;
    summary: string;
    publicNote: string | null;
    portalSettingsUrl: string;
  }): { subject: string; text: string } {
    const noteBlock =
      opts.publicNote !== null && opts.publicNote.trim() !== ""
        ? `\nNote from the operator:\n${opts.publicNote}\n`
        : "";
    return renderConfigured("providerVerificationUpdate", {
      registryName: opts.registryName,
      providerDisplayName: opts.providerDisplayName,
      statusLabel: opts.statusLabel,
      summary: opts.summary,
      publicNote: opts.publicNote ?? "",
      noteBlock,
      portalSettingsUrl: opts.portalSettingsUrl
    });
  },
  complaintReceivedComplainant(opts: {
    registryName: string;
    operatorName: string;
    complaintId: string;
    contactUrl: string;
  }): { subject: string; text: string } {
    return renderConfigured("complaintReceivedComplainant", {
      registryName: opts.registryName,
      operatorName: opts.operatorName,
      complaintId: opts.complaintId,
      contactUrl: opts.contactUrl
    });
  },
  complaintReceivedOperator(opts: {
    registryName: string;
    complaintId: string;
    complaintType: string;
    severity: string;
    targetSummary: string;
    adminHomeUrl: string;
  }): { subject: string; text: string } {
    return renderConfigured("complaintReceivedOperator", {
      registryName: opts.registryName,
      complaintId: opts.complaintId,
      complaintType: opts.complaintType,
      severity: opts.severity,
      targetSummary: opts.targetSummary,
      adminHomeUrl: opts.adminHomeUrl
    });
  },
  /**
   * Notification to the user a complaint has just been assigned to. Sent
   * from the admin update endpoint when the assignment changes and the
   * operator left the "Notify assignee" toggle on (the default).
   */
  complaintAssigned(opts: {
    registryName: string;
    assigneeName: string;
    assignedByName: string;
    complaintId: string;
    complaintType: string;
    severity: string;
    targetSummary: string;
    statusLabel: string;
    description: string;
    complaintUrl: string;
  }): { subject: string; text: string } {
    const excerpt =
      opts.description.length > 240
        ? `${opts.description.slice(0, 240)}…`
        : opts.description;
    return renderConfigured("complaintAssigned", {
      registryName: opts.registryName,
      assigneeName: opts.assigneeName,
      assignedByName: opts.assignedByName,
      complaintId: opts.complaintId,
      complaintIdShort: opts.complaintId.slice(0, 8),
      complaintType: opts.complaintType,
      severity: opts.severity,
      statusLabel: opts.statusLabel,
      targetSummary: opts.targetSummary,
      description: opts.description,
      excerpt,
      complaintUrl: opts.complaintUrl
    });
  },
  /**
   * Sent when an admin changes a user's status (suspend / reactivate /
   * deactivate, etc.). Skipped server-side when the admin un-ticks the
   * "send email" checkbox in UsersAdmin.
   */
  userStatusChanged(opts: {
    name: string;
    registryName: string;
    operatorName: string;
    statusLabel: string;
    loginUrl: string;
    reason: string | null;
  }): { subject: string; text: string } {
    const reasonBlock =
      opts.reason !== null && opts.reason.trim() !== ""
        ? `\nReason from the operator:\n${opts.reason}\n`
        : "";
    return renderConfigured("userStatusChanged", {
      name: opts.name,
      registryName: opts.registryName,
      operatorName: opts.operatorName,
      statusLabel: opts.statusLabel,
      loginUrl: opts.loginUrl,
      reason: opts.reason ?? "",
      reasonBlock
    });
  },
  /**
   * Sent to provider contacts when an admin toggles published /
   * adminSuspended on a provider (the visibility panel — separate from
   * the verification flow which has its own template).
   */
  providerVisibilityChanged(opts: {
    registryName: string;
    providerDisplayName: string;
    visibilityLabel: string;
    summary: string;
    portalSettingsUrl: string;
  }): { subject: string; text: string } {
    return renderConfigured("providerVisibilityChanged", {
      registryName: opts.registryName,
      providerDisplayName: opts.providerDisplayName,
      visibilityLabel: opts.visibilityLabel,
      summary: opts.summary,
      portalSettingsUrl: opts.portalSettingsUrl
    });
  },
  /**
   * Sent to provider contacts when an admin runs a resource lifecycle
   * transition (approve / reject / suspend / restore / deprecate /
   * remove). Skipped server-side when notifyByEmail is unticked.
   */
  resourceLifecycleChanged(opts: {
    registryName: string;
    providerDisplayName: string;
    resourceTitle: string;
    actionLabel: string;
    newStatusLabel: string;
    reason: string;
    portalResourcesUrl: string;
    publicCatalogUrl?: string;
  }): { subject: string; text: string } {
    const publicCatalogBlock =
      opts.publicCatalogUrl !== undefined && opts.publicCatalogUrl !== ""
        ? `\nPublic catalog entry:\n  ${opts.publicCatalogUrl}\n`
        : "";
    return renderConfigured("resourceLifecycleChanged", {
      registryName: opts.registryName,
      providerDisplayName: opts.providerDisplayName,
      resourceTitle: opts.resourceTitle,
      actionLabel: opts.actionLabel,
      newStatusLabel: opts.newStatusLabel,
      reason: opts.reason,
      portalResourcesUrl: opts.portalResourcesUrl,
      publicCatalogUrl: opts.publicCatalogUrl ?? "",
      publicCatalogBlock
    });
  },
  /** Verifier or admin opens a review-thread; sent to provider users. */
  reviewThreadOpened(opts: {
    registryName: string;
    reviewTitle: string;
    authorName: string;
    excerpt: string;
    threadUrl: string;
  }): { subject: string; text: string } {
    return renderConfigured("reviewThreadOpened", {
      registryName: opts.registryName,
      reviewTitle: opts.reviewTitle,
      authorName: opts.authorName,
      excerpt: opts.excerpt,
      threadUrl: opts.threadUrl
    });
  },
  /** Provider replied on a thread; sent to verifier + admins. */
  reviewThreadProviderReply(opts: {
    registryName: string;
    reviewTitle: string;
    authorName: string;
    excerpt: string;
    threadUrl: string;
    attachmentCount: number;
  }): { subject: string; text: string } {
    return renderConfigured("reviewThreadProviderReply", {
      registryName: opts.registryName,
      reviewTitle: opts.reviewTitle,
      authorName: opts.authorName,
      excerpt: opts.excerpt,
      threadUrl: opts.threadUrl,
      attachmentLine:
        opts.attachmentCount > 0 ? `\n${opts.attachmentCount} file(s) attached.\n` : ""
    });
  },
  /** Verifier or admin replied on a thread; sent to provider users. */
  reviewThreadVerifierReply(opts: {
    registryName: string;
    reviewTitle: string;
    authorName: string;
    excerpt: string;
    threadUrl: string;
    attachmentCount: number;
  }): { subject: string; text: string } {
    return renderConfigured("reviewThreadVerifierReply", {
      registryName: opts.registryName,
      reviewTitle: opts.reviewTitle,
      authorName: opts.authorName,
      excerpt: opts.excerpt,
      threadUrl: opts.threadUrl,
      attachmentLine:
        opts.attachmentCount > 0 ? `\n${opts.attachmentCount} file(s) attached.\n` : ""
    });
  },
  /** Status flipped to resolved; sent to both parties. */
  reviewThreadResolved(opts: {
    registryName: string;
    reviewTitle: string;
    threadUrl: string;
  }): { subject: string; text: string } {
    return renderConfigured("reviewThreadResolved", {
      registryName: opts.registryName,
      reviewTitle: opts.reviewTitle,
      threadUrl: opts.threadUrl
    });
  }
};
