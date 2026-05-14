/**
 * scripts/test-emails.ts — exercise every transactional email template once.
 *
 * Renders each template in `src/lib/email.ts` with realistic placeholder
 * data and calls `sendEmail` directly. The point of this script is *not*
 * to test DB logic — it's to verify (a) every template renders without
 * leaking `{placeholder}` strings, and (b) every email path actually
 * delivers via the configured SMTP transport.
 *
 * Usage:
 *
 *   1. Pair `.env` with real SMTP credentials (SMTP_HOST, SMTP_PORT,
 *      SMTP_USER, SMTP_PASS) — without SMTP, emails are only logged to
 *      the console.
 *   2. Set `TEST_EMAIL_INBOX=you@example.com`. Every template will be
 *      delivered there; the subject is prefixed with the intended
 *      recipient address (e.g. "[orig: provider@example.com] Provider
 *      verification update — ...") so multi-recipient flows stay
 *      distinguishable.
 *   3. Run:   npm run test:emails
 *
 * Optional CLI flag:
 *   --only=verification,passwordReset    run a subset by template key
 *
 * Exit codes:
 *   0  every template attempted (delivery may have fallen back to console
 *      if SMTP is unconfigured — check the JSON log lines for `redirected`
 *      and `smtpConfigured`).
 *   1  config invalid OR a template threw while rendering.
 */

import { config as loadDotenv } from "dotenv";

loadDotenv();

import { ConfigError, getConfig } from "../src/lib/config";
import { emailTemplates, sendEmail } from "../src/lib/email";

type TemplateKey =
  | "verification"
  | "passwordReset"
  | "passwordChanged"
  | "contactConfirmation"
  | "resourceSubmittedForReview"
  | "reviewDecision"
  | "providerVerificationUpdate"
  | "complaintReceivedComplainant"
  | "complaintReceivedOperator"
  | "complaintAssigned"
  | "userStatusChanged"
  | "providerVisibilityChanged"
  | "resourceLifecycleChanged";

// Realistic-but-fake recipients. Each one differs so when the redirect
// prefixes the subject with `[orig: ...]` you can scan the inbox and
// confirm every flow's recipient resolution worked.
const FIXTURE = {
  verifyUrl: "https://example.test/auth/verify?token=test-verification-token",
  resetUrl: "https://example.test/auth/reset/test-reset-token",
  loginUrl: "https://example.test/login",
  portalResourcesUrl: "https://example.test/provider/resources",
  portalReviewsUrl: "https://example.test/provider/reviews",
  portalSettingsUrl: "https://example.test/provider/settings",
  publicCatalogUrl: "https://example.test/registry/example-model",
  contactUrl: "https://example.test/contact",
  adminHomeUrl: "https://example.test/admin",
  complaintUrl: "https://example.test/admin/complaints/cmpl_01HTEST",
  complaintId: "cmpl_01HTEST00000000000000",
  reviewId: "rev_01HTEST00000000000000"
};

function tagFor(name: TemplateKey): string {
  // The user only sees the inbox subject — this tag at the start makes it
  // trivial to spot the template even before reading the body.
  return `[test:${name}]`;
}

function buildCases(registryName: string, operatorName: string) {
  return [
    {
      key: "verification" as TemplateKey,
      recipient: "new-user@example.test",
      build: () =>
        emailTemplates.verification({
          name: "Alex",
          verifyUrl: FIXTURE.verifyUrl,
          registryName
        })
    },
    {
      key: "passwordReset" as TemplateKey,
      recipient: "user-forgot@example.test",
      build: () =>
        emailTemplates.passwordReset({
          name: "Alex",
          resetUrl: FIXTURE.resetUrl,
          registryName
        })
    },
    {
      key: "passwordChanged" as TemplateKey,
      recipient: "user-changed@example.test",
      build: () =>
        emailTemplates.passwordChanged({
          name: "Alex",
          registryName,
          loginUrl: FIXTURE.loginUrl
        })
    },
    {
      key: "contactConfirmation" as TemplateKey,
      recipient: "sender@example.test",
      build: () =>
        emailTemplates.contactConfirmation({
          senderName: "Sam Sender",
          registryName,
          operatorName,
          topicLabel: "General question",
          replyIntro:
            `Thank you for contacting ${registryName}. Your message has been received.`,
          verifyUrl: `${FIXTURE.verifyUrl}&purpose=contact`
        })
    },
    {
      key: "resourceSubmittedForReview" as TemplateKey,
      recipient: "operators@example.test",
      build: () =>
        emailTemplates.resourceSubmittedForReview({
          registryName,
          resourceTitle: "Example Sovereign Model v1.0",
          reviewId: FIXTURE.reviewId,
          portalResourcesUrl: FIXTURE.portalResourcesUrl,
          portalReviewsUrl: FIXTURE.portalReviewsUrl
        })
    },
    {
      key: "reviewDecision" as TemplateKey,
      recipient: "provider@example.test",
      build: () =>
        emailTemplates.reviewDecision({
          registryName,
          providerDisplayName: "Example Provider Ltd",
          resourceTitle: "Example Sovereign Model v1.0",
          decisionLabel: "Approved and listed",
          decisionSummary:
            "All six §11 sovereignty checklist items passed. Listed publicly.",
          portalReviewsUrl: FIXTURE.portalReviewsUrl,
          publicCatalogUrl: FIXTURE.publicCatalogUrl
        })
    },
    {
      key: "providerVerificationUpdate" as TemplateKey,
      recipient: "provider-contact@example.test",
      build: () =>
        emailTemplates.providerVerificationUpdate({
          registryName,
          providerDisplayName: "Example Provider Ltd",
          statusLabel: "Verified",
          summary:
            "We confirmed your organisation's registration documents and contact info.",
          publicNote:
            "Verified by the registry on " + new Date().toISOString().slice(0, 10),
          portalSettingsUrl: FIXTURE.portalSettingsUrl
        })
    },
    {
      key: "complaintReceivedComplainant" as TemplateKey,
      recipient: "complainant@example.test",
      build: () =>
        emailTemplates.complaintReceivedComplainant({
          registryName,
          operatorName,
          complaintId: FIXTURE.complaintId,
          contactUrl: FIXTURE.contactUrl
        })
    },
    {
      key: "complaintReceivedOperator" as TemplateKey,
      recipient: "operator-inbox@example.test",
      build: () =>
        emailTemplates.complaintReceivedOperator({
          registryName,
          complaintId: FIXTURE.complaintId,
          complaintType: "Listing accuracy",
          severity: "Medium",
          targetSummary: "Resource: Example Sovereign Model v1.0",
          adminHomeUrl: FIXTURE.adminHomeUrl
        })
    },
    {
      key: "complaintAssigned" as TemplateKey,
      recipient: "assignee@example.test",
      build: () =>
        emailTemplates.complaintAssigned({
          registryName,
          assigneeName: "Jordan Reviewer",
          assignedByName: "Casey Admin",
          complaintId: FIXTURE.complaintId,
          complaintType: "Listing accuracy",
          severity: "Medium",
          statusLabel: "Investigating",
          targetSummary: "Resource: Example Sovereign Model v1.0",
          description:
            "The complainant reports that the listed model card does not match the latest published checkpoint. Please verify.",
          complaintUrl: FIXTURE.complaintUrl
        })
    },
    {
      key: "userStatusChanged" as TemplateKey,
      recipient: "user-status@example.test",
      build: () =>
        emailTemplates.userStatusChanged({
          name: "Alex",
          registryName,
          operatorName,
          statusLabel: "Suspended",
          loginUrl: FIXTURE.loginUrl,
          reason:
            "Repeated submission of resources that do not meet our acceptable-use policy."
        })
    },
    {
      key: "providerVisibilityChanged" as TemplateKey,
      recipient: "provider-visibility@example.test",
      build: () =>
        emailTemplates.providerVisibilityChanged({
          registryName,
          providerDisplayName: "Example Provider Ltd",
          visibilityLabel: "Hidden — admin suspended",
          summary:
            "Your organisation has been hidden from the public registry pending an enforcement review.",
          portalSettingsUrl: FIXTURE.portalSettingsUrl
        })
    },
    {
      key: "resourceLifecycleChanged" as TemplateKey,
      recipient: "provider-lifecycle@example.test",
      build: () =>
        emailTemplates.resourceLifecycleChanged({
          registryName,
          providerDisplayName: "Example Provider Ltd",
          resourceTitle: "Example Sovereign Model v1.0",
          actionLabel: "Suspended",
          newStatusLabel: "suspended",
          reason:
            "Documentation no longer matches the deployed checkpoint. Resubmit after updating the model card.",
          portalResourcesUrl: FIXTURE.portalResourcesUrl,
          publicCatalogUrl: undefined
        })
    }
  ] as const;
}

function parseOnly(argv: string[]): Set<TemplateKey> | null {
  const flag = argv.find((a) => a.startsWith("--only="));
  if (!flag) return null;
  const list = flag.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return null;
  return new Set(list as TemplateKey[]);
}

function findUnreplacedPlaceholders(text: string): string[] {
  // Templates use {placeholder} markers — anything still present means we
  // forgot to pass that key. Skip standalone braces in URLs etc.
  const matches = text.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g);
  return matches ? Array.from(new Set(matches)) : [];
}

async function main(): Promise<void> {
  let cfg;
  try {
    cfg = getConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error("✗ Config invalid — fix .env before running the email harness:");
      console.error(`  ${error.message}`);
    } else {
      console.error("✗ Unexpected error loading config:", error);
    }
    process.exit(1);
  }

  if (cfg.mail.testInbox === null) {
    console.error(
      "✗ TEST_EMAIL_INBOX is not set. Add it to .env (a valid email address) so " +
        "every test email lands in one place."
    );
    process.exit(1);
  }
  if (cfg.mail.smtpHost === null || cfg.mail.smtpPort === null) {
    console.warn(
      "⚠ SMTP_HOST / SMTP_PORT not configured — every email will fall back to " +
        "the console channel. Bodies will be printed below but nothing arrives in " +
        `${cfg.mail.testInbox}.`
    );
  }

  const only = parseOnly(process.argv.slice(2));
  const cases = buildCases(cfg.registryName, cfg.operatorName);

  const filtered = only ? cases.filter((c) => only.has(c.key)) : cases;
  if (filtered.length === 0) {
    console.error(
      `✗ --only filter matched zero templates. Known keys: ${cases.map((c) => c.key).join(", ")}`
    );
    process.exit(1);
  }

  console.info(
    `→ Running email harness: ${filtered.length} template(s), redirected to ${cfg.mail.testInbox}\n`
  );

  type Result = {
    key: TemplateKey;
    intendedTo: string;
    delivered: boolean;
    channel: string;
    leakedPlaceholders: string[];
    error?: string;
  };
  const results: Result[] = [];

  for (const c of filtered) {
    try {
      const rendered = c.build();
      const leaked = [
        ...findUnreplacedPlaceholders(rendered.subject),
        ...findUnreplacedPlaceholders(rendered.text)
      ];
      const taggedSubject = `${tagFor(c.key)} ${rendered.subject}`;
      const result = await sendEmail({
        to: c.recipient,
        subject: taggedSubject,
        text: rendered.text
      });
      results.push({
        key: c.key,
        intendedTo: c.recipient,
        delivered: result.delivered,
        channel: result.channel,
        leakedPlaceholders: leaked
      });
    } catch (error) {
      results.push({
        key: c.key,
        intendedTo: c.recipient,
        delivered: false,
        channel: "error",
        leakedPlaceholders: [],
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Summary table
  console.info("\n=== Email harness summary ===\n");
  const w = {
    key: Math.max("template".length, ...results.map((r) => r.key.length)),
    to: Math.max("intended-recipient".length, ...results.map((r) => r.intendedTo.length))
  };
  const head =
    "template".padEnd(w.key) +
    "  " +
    "intended-recipient".padEnd(w.to) +
    "  delivered  channel    notes";
  console.info(head);
  console.info("-".repeat(head.length));
  for (const r of results) {
    const status = r.error
      ? `ERROR  ${r.error}`
      : r.leakedPlaceholders.length > 0
        ? `LEAK   ${r.leakedPlaceholders.join(",")}`
        : "ok";
    console.info(
      r.key.padEnd(w.key) +
        "  " +
        r.intendedTo.padEnd(w.to) +
        "  " +
        (r.delivered ? "yes" : "no ").padEnd(9) +
        "  " +
        r.channel.padEnd(9) +
        "  " +
        status
    );
  }

  const hadError = results.some((r) => r.error || r.leakedPlaceholders.length > 0);
  if (hadError) {
    console.error(
      "\n✗ At least one template errored or rendered with un-substituted " +
        "placeholders. Inspect the rows above."
    );
    process.exit(1);
  }

  console.info(
    `\n✓ ${results.length} email(s) attempted. Check ${cfg.mail.testInbox} ` +
      "to confirm visual rendering."
  );
  process.exit(0);
}

void main();
