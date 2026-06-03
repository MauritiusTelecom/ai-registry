/**
 * Deployment configuration.
 *
 * Reads required environment variables at boot, validates them, and exposes a
 * typed object the rest of the application can consume. Keeping these values
 * in one module is what lets the codebase remain jurisdiction-agnostic - there
 * is no Mauritius-specific literal anywhere in `src/`; the reference operator
 * supplies the strings via `.env`.
 *
 * Source spec: AIR-SPEC 0.4 §4 (Deployment configuration).
 *
 * Usage:
 *
 * ```ts
 * import { getConfig } from "@/lib/config";
 * const cfg = getConfig();
 * cfg.registryName;        // "Mauritius AI Registry"
 * cfg.identityDomain;      // "air.mu"
 * cfg.supportedLanguages;  // ["en", "fr", "mfe"]
 * ```
 *
 * If any required variable is missing or invalid, `getConfig()` throws at
 * first call and the application refuses to boot. This is intentional: a
 * misconfigured registry is worse than a clearly-broken one.
 */

export type RegistryConfig = {
  /** PostgreSQL connection string. Must expose a schema named `registry`. */
  databaseUrl: string;
  /** Display name (e.g. "Mauritius AI Registry"). */
  registryName: string;
  /** Public portal hostname (e.g. "airegistry.mu"). No scheme, no trailing slash. */
  portalDomain: string;
  /** REST API base URL (e.g. "https://airegistry.mu/api/v1"). */
  apiBaseUrl: string;
  /** ISO / local jurisdiction code (e.g. "MU", "EU"). */
  jurisdiction: string;
  /** AIR-ID namespace authority (e.g. "air.mu"). */
  identityDomain: string;
  /** Display name of the deploying operator. */
  operatorName: string;
  /** Public contact email shown on /contact (defaults to airegistry@telecom.mu). */
  operatorContactEmail: string;
  /** First line of the office block on /contact (defaults to operatorName). */
  operatorOfficeName: string;
  /** Remaining office address lines on /contact (newline-separated). */
  operatorOfficeAddress: string;
  /** Office hours line on /contact. */
  operatorContactHours: string;
  /** Jurisdiction name for marketing copy (e.g. Mauritius on /registry, home hero). */
  jurisdictionDisplayName: string;
  /** Privacy page: data-protection law name (e.g. Mauritius Data Protection Act 2017). */
  privacyDataProtectionAct: string;
  /** Open-source monorepo URL for footer and ecosystem links. */
  openSourceRepoUrl: string;
  /** BCP-47 language codes the deployment serves. */
  supportedLanguages: string[];
  /** Default language; always present in `supportedLanguages`. */
  defaultLanguage: string;
  /** Resource type codes the deployment accepts (subset of model/agent/tool/skill). */
  resourceTypes: string[];
  /** Auth subsystem (Phase 2). */
  auth: {
    /** HMAC signing secret for session cookies and email tokens. */
    secret: string;
    /** Session cookie name. */
    sessionCookieName: string;
    /** Session lifetime in seconds (default roles). */
    sessionTtlSeconds: number;
    /** Shorter session lifetime for admin / reviewer roles. */
    sessionTtlAdminSeconds: number;
  };
  /** Outbound mail (Phase 2). All SMTP fields optional - when unset the email
   * helper logs links to the console (dev fallback). */
  mail: {
    from: string;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpPass: string | null;
    /**
     * When set, every transactional email is rerouted to this address and
     * the subject is prefixed with `[orig: <intended-recipient>]`. Designed
     * for QA / staging so an operator can verify every email path against
     * a single inbox. Leave unset in production.
     */
    testInbox: string | null;
  };
  /**
   * First paragraph of the auto-reply after a public contact submission.
   * Override with CONTACT_FORM_REPLY_MESSAGE in .env for operator-specific copy.
   */
  contactFormReplyMessage: string;
  /**
   * Optional inbox for operator alerts (e.g. new public complaints).
   * When unset, complaint notifications to staff are skipped.
   */
  operatorInboxEmail: string | null;
  /**
   * Public-facing contact URL surfaced in transactional emails (e.g. the
   * report acknowledgement). Defaults to `https://{portalDomain}/contact`
   * when PUBLIC_CONTACT_URL is not set.
   */
  publicContactUrl: string;
  /**
   * Admin console URL surfaced in operator-notification emails (e.g. the
   * inbox alert for a new public report). Defaults to
   * `https://{portalDomain}/admin` when ADMIN_HOME_URL is not set.
   */
  adminHomeUrl: string;
  /**
   * Email templates for the "Report this listing" flow. Each field is a
   * template string that can reference any of the placeholders:
   *   {registryName} {operatorName} {complaintId} {reason}
   *   {complaintType} {severity} {targetSummary} {contactUrl} {adminHomeUrl}
   *
   * Set via .env to keep operator-specific wording out of the source tree.
   * Defaults fall back to a built-in English copy that uses REGISTRY_NAME /
   * OPERATOR_NAME so a fresh deployment still produces sensible mail.
   */
  publicReportEmail: {
    ackSubject: string;
    ackBody: string;
    operatorSubject: string;
    operatorBody: string;
  };
  /**
   * Subject + body templates for every transactional / lifecycle email
   * the registry sends. Each pair can be overridden via .env (see
   * .env.example) and references placeholders wrapped in {braces}.
   * Newlines in env values may be written as the two-char escape `\n`.
   */
  emailTemplates: {
    verification: EmailTemplate;
    passwordReset: EmailTemplate;
    passwordChanged: EmailTemplate;
    contactConfirmation: EmailTemplate;
    resourceSubmittedForReview: EmailTemplate;
    reviewDecision: EmailTemplate;
    providerVerificationUpdate: EmailTemplate;
    complaintReceivedComplainant: EmailTemplate;
    complaintReceivedOperator: EmailTemplate;
    complaintAssigned: EmailTemplate;
    userStatusChanged: EmailTemplate;
    providerVisibilityChanged: EmailTemplate;
    resourceLifecycleChanged: EmailTemplate;
    reviewThreadOpened: EmailTemplate;
    reviewThreadProviderReply: EmailTemplate;
    reviewThreadVerifierReply: EmailTemplate;
    reviewThreadResolved: EmailTemplate;
  };
};

/** Subject + body for a single transactional email. */
export type EmailTemplate = {
  subject: string;
  body: string;
};

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "REGISTRY_NAME",
  "PORTAL_DOMAIN",
  "API_BASE_URL",
  "JURISDICTION",
  "IDENTITY_DOMAIN",
  "OPERATOR_NAME",
  "SUPPORTED_LANGUAGES",
  "DEFAULT_LANGUAGE",
  "RESOURCE_TYPES",
  "AUTH_SECRET"
] as const;

type RequiredKey = (typeof REQUIRED_KEYS)[number];

const KNOWN_RESOURCE_TYPES = new Set(["model", "agent", "tool", "skill"]);

/** Reference defaults when JURISDICTION_DISPLAY_NAME is unset. */
const JURISDICTION_DISPLAY_DEFAULTS: Record<string, string> = {
  MU: "Mauritius"
};

function defaultJurisdictionDisplayName(code: string): string {
  return JURISDICTION_DISPLAY_DEFAULTS[code.toUpperCase()] ?? code;
}

let cached: RegistryConfig | null = null;
let cachedError: Error | null = null;

function readRequired(env: NodeJS.ProcessEnv, key: RequiredKey): string {
  const value = env[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ConfigError(
      `Missing required environment variable ${key}. ` +
        `Copy .env.example to .env and fill in every key in the deployment-configuration block.`
    );
  }
  return value.trim();
}

/** Optional env var; returns trimmed string or empty when unset. */
function readOptional(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (typeof value !== "string") return "";
  return value.trim();
}

/** Like readOptional but expands literal `\\n` to newlines (for multiline .env values). */
function readOptionalMultiline(env: NodeJS.ProcessEnv, key: string): string {
  const raw = readOptional(env, key);
  return raw === "" ? "" : raw.replace(/\\n/g, "\n");
}

/**
 * Build an RFC 5322 From header. When a display name is supplied, the
 * result is `"Display Name" <address>`; otherwise the bare address.
 */
function composeFromHeader(address: string, displayName: string): string {
  if (displayName === "") return address;
  return `"${displayName}" <${address}>`;
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function validatePortalDomain(value: string): string {
  // No scheme, no trailing slash; allow a port for local dev.
  if (/^[a-zA-Z]+:\/\//.test(value)) {
    throw new ConfigError(
      `PORTAL_DOMAIN must not include a scheme; got "${value}". Pass just the hostname (e.g. "airegistry.mu").`
    );
  }
  if (value.endsWith("/")) {
    throw new ConfigError(`PORTAL_DOMAIN must not end with a slash; got "${value}".`);
  }
  return value;
}

function validateApiBaseUrl(value: string): string {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`unsupported protocol ${parsed.protocol}`);
    }
    if (value.endsWith("/")) {
      throw new Error("must not end with a slash");
    }
    return value;
  } catch (error) {
    throw new ConfigError(
      `API_BASE_URL is not a valid http(s) URL without trailing slash: "${value}" (${(error as Error).message}).`
    );
  }
}

function validateLanguageCode(code: string): string {
  // Normalize env values such as FR, " fr ", en-US → fr, fr, en-us.
  const normalized = code.trim().toLowerCase();
  if (!/^[a-z]{2,8}(-[a-z0-9]{2,8})*$/.test(normalized)) {
    throw new ConfigError(
      `Language code "${code}" does not look like a BCP-47 tag (expected e.g. "en", "fr", "mfe", "en-US").`
    );
  }
  return normalized;
}

function validateResourceTypeCode(code: string): string {
  if (!KNOWN_RESOURCE_TYPES.has(code)) {
    throw new ConfigError(
      `RESOURCE_TYPES contains "${code}" which is not one of the AIR-SPEC §7 codes ` +
        `(model | agent | tool | skill). Adjust RESOURCE_TYPES in .env.`
    );
  }
  return code;
}

function loadFromEnv(env: NodeJS.ProcessEnv): RegistryConfig {
  const databaseUrl = readRequired(env, "DATABASE_URL");
  const registryName = readRequired(env, "REGISTRY_NAME");
  const portalDomain = validatePortalDomain(readRequired(env, "PORTAL_DOMAIN"));
  const apiBaseUrl = validateApiBaseUrl(readRequired(env, "API_BASE_URL"));
  const jurisdiction = readRequired(env, "JURISDICTION");
  const identityDomain = readRequired(env, "IDENTITY_DOMAIN");
  const operatorName = readRequired(env, "OPERATOR_NAME");
  const operatorContactEmailRaw = readOptional(env, "OPERATOR_CONTACT_EMAIL");
  const operatorContactEmail =
    operatorContactEmailRaw || "airegistry@telecom.mu";
  const operatorOfficeNameRaw = readOptional(env, "OPERATOR_OFFICE_NAME");
  const operatorOfficeName = operatorOfficeNameRaw || operatorName;
  const operatorOfficeAddress = readOptionalMultiline(env, "OPERATOR_OFFICE_ADDRESS");
  const operatorContactHoursRaw = readOptional(env, "OPERATOR_CONTACT_HOURS");
  const operatorContactHours =
    operatorContactHoursRaw || "Mon-Fri · 09:00-17:30 · GMT+4";

  const jurisdictionDisplayName =
    readOptional(env, "JURISDICTION_DISPLAY_NAME") ||
    defaultJurisdictionDisplayName(jurisdiction);
  const privacyDataProtectionActRaw = readOptional(env, "PRIVACY_DATA_PROTECTION_ACT");
  const privacyDataProtectionAct =
    privacyDataProtectionActRaw ||
    `${jurisdictionDisplayName} Data Protection Act 2017`;
  const openSourceRepoUrlRaw = readOptional(env, "OPEN_SOURCE_REPO_URL");
  const openSourceRepoUrl =
    openSourceRepoUrlRaw || "https://github.com/MauritiusTelecom/ai-registry";

  const supportedLanguages = splitCsv(readRequired(env, "SUPPORTED_LANGUAGES")).map(
    validateLanguageCode
  );
  if (supportedLanguages.length === 0) {
    throw new ConfigError("SUPPORTED_LANGUAGES must list at least one language code.");
  }

  const defaultLanguage = validateLanguageCode(readRequired(env, "DEFAULT_LANGUAGE"));
  if (!supportedLanguages.includes(defaultLanguage)) {
    throw new ConfigError(
      `DEFAULT_LANGUAGE "${defaultLanguage}" is not present in SUPPORTED_LANGUAGES (${supportedLanguages.join(", ")}).`
    );
  }

  const resourceTypes = splitCsv(readRequired(env, "RESOURCE_TYPES")).map(
    validateResourceTypeCode
  );
  if (resourceTypes.length === 0) {
    throw new ConfigError("RESOURCE_TYPES must list at least one resource type code.");
  }

  // Light sanity check on jurisdiction: 2–10 chars, alphanumeric + hyphen.
  if (!/^[A-Za-z0-9-]{2,10}$/.test(jurisdiction)) {
    throw new ConfigError(
      `JURISDICTION "${jurisdiction}" should be a short alphanumeric code (e.g. "MU", "EU", "MU-PL").`
    );
  }

  // ── Auth (Phase 2) ─────────────────────────────────────────────────────
  const authSecret = readRequired(env, "AUTH_SECRET");
  if (authSecret.length < 32 || /^replace-with/.test(authSecret)) {
    throw new ConfigError(
      "AUTH_SECRET must be at least 32 characters and not the placeholder value. " +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"'
    );
  }
  const sessionCookieName = (env.SESSION_COOKIE_NAME ?? "airegistry_session").trim();
  const sessionTtlRaw = (env.SESSION_TTL_SECONDS ?? "604800").trim();
  const sessionTtlSeconds = Number.parseInt(sessionTtlRaw, 10);
  if (!Number.isFinite(sessionTtlSeconds) || sessionTtlSeconds < 60) {
    throw new ConfigError(
      `SESSION_TTL_SECONDS must be an integer ≥ 60 (got "${sessionTtlRaw}").`
    );
  }
  const sessionTtlAdminRaw = (env.SESSION_TTL_ADMIN_SECONDS ?? "28800").trim();
  const sessionTtlAdminSeconds = Number.parseInt(sessionTtlAdminRaw, 10);
  if (!Number.isFinite(sessionTtlAdminSeconds) || sessionTtlAdminSeconds < 60) {
    throw new ConfigError(
      `SESSION_TTL_ADMIN_SECONDS must be an integer ≥ 60 (got "${sessionTtlAdminRaw}").`
    );
  }

  // ── Mail (Phase 2) ─────────────────────────────────────────────────────
  // Accept either MAIL_FROM (original) or EMAIL_FROM (alternate spelling
  // some operators use). MAIL_FROM wins when both are set.
  const mailFromRaw =
    (env.MAIL_FROM ?? "").trim() || (env.EMAIL_FROM ?? "").trim();
  if (mailFromRaw !== "" && !/^\S+@\S+\.\S+$/.test(mailFromRaw)) {
    throw new ConfigError(
      `MAIL_FROM / EMAIL_FROM must be a valid email address (got "${mailFromRaw}").`
    );
  }
  // Optional display name. When set, the From header is rendered as
  // `"Display Name" <address>` per RFC 5322. Common for branded sends.
  const senderName =
    (env.EMAIL_SENDER_NAME ?? "").trim() || (env.MAIL_SENDER_NAME ?? "").trim();
  // Sanity check: forbid double-quotes inside the display name — they'd
  // need escaping and the resulting header would be ambiguous.
  if (senderName.includes('"')) {
    throw new ConfigError(
      `EMAIL_SENDER_NAME must not contain double-quotes (got "${senderName}").`
    );
  }
  const mailFrom = mailFromRaw;
  const smtpHost = (env.SMTP_HOST ?? "").trim() || null;
  const smtpPortRaw = (env.SMTP_PORT ?? "").trim();
  const smtpPort = smtpPortRaw === "" ? null : Number.parseInt(smtpPortRaw, 10);
  if (smtpPort !== null && (!Number.isFinite(smtpPort) || smtpPort < 1 || smtpPort > 65535)) {
    throw new ConfigError(`SMTP_PORT must be a valid TCP port (got "${smtpPortRaw}").`);
  }
  const smtpUser = (env.SMTP_USER ?? "").trim() || null;
  const smtpPass = (env.SMTP_PASS ?? "").trim() || null;

  // QA helper — when set, every email is rerouted here. Validated as an
  // address so we never silently swallow a typo.
  const testInboxRaw = (env.TEST_EMAIL_INBOX ?? "").trim();
  let testInbox: string | null = null;
  if (testInboxRaw !== "") {
    if (!/^\S+@\S+\.\S+$/.test(testInboxRaw)) {
      throw new ConfigError(
        `TEST_EMAIL_INBOX must be a valid email address (got "${testInboxRaw}").`
      );
    }
    testInbox = testInboxRaw.toLowerCase();
  }

  const contactFormReplyRaw = (env.CONTACT_FORM_REPLY_MESSAGE ?? "").trim();
  const contactFormReplyMessage =
    contactFormReplyRaw ||
    [
      `Thank you for contacting ${registryName}.`,
      `Your message has been received by ${operatorName}.`,
      "Please confirm your email using the link below so we can reliably reach you.",
      "If you later create an account with the same email address, verified messages will appear in your provider portal."
    ].join(" ");

  const operatorInboxRaw = (env.OPERATOR_INBOX_EMAIL ?? "").trim();
  const operatorInboxEmail =
    operatorInboxRaw !== "" && /^\S+@\S+\.\S+$/.test(operatorInboxRaw)
      ? operatorInboxRaw.toLowerCase()
      : null;

  // ── Public URLs and report-email templates ────────────────────────────
  // Allow operators to override the contact / admin URLs surfaced in
  // transactional emails. Useful when the public portal and the API base
  // are served from different hostnames.
  const publicContactUrl =
    (env.PUBLIC_CONTACT_URL ?? "").trim() || `https://${portalDomain}/contact`;
  const adminHomeUrl =
    (env.ADMIN_HOME_URL ?? "").trim() || `https://${portalDomain}/admin`;

  // Email templates for the public listing-report flow. Each value is a
  // template; placeholders are wrapped in `{braces}`. Escaped newlines
  // (\n) in the env value are converted to real newlines so operators can
  // keep the value on a single line in .env.
  const unescape = (raw: string): string =>
    raw.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t");

  const defaultAckSubject = `Report received - {registryName}`;
  const defaultAckBody =
    `Thank you for contacting {registryName}.\n\n` +
    `We recorded your report (reference: {complaintId}). ` +
    `{operatorName} will review it according to our process and may follow up at this email if more information is needed.\n\n` +
    `You can reach us again via:\n  {contactUrl}\n\n` +
    `- {operatorName} · {registryName}`;
  const defaultOperatorSubject = `[{registryName}] New listing report {complaintId}`;
  const defaultOperatorBody =
    `A new public listing report was filed.\n\n` +
    `Id: {complaintId}\n` +
    `Reason: {reason}\n` +
    `Mapped type: {complaintType}\n` +
    `Severity: {severity}\n` +
    `Target: {targetSummary}\n\n` +
    `Open the admin console:\n  {adminHomeUrl}\n\n` +
    `- {registryName} (automated)`;

  const ackSubject = unescape((env.PUBLIC_REPORT_ACK_SUBJECT ?? "").trim()) || defaultAckSubject;
  const ackBody = unescape((env.PUBLIC_REPORT_ACK_BODY ?? "").trim()) || defaultAckBody;
  const operatorSubject =
    unescape((env.PUBLIC_REPORT_OPERATOR_SUBJECT ?? "").trim()) || defaultOperatorSubject;
  const operatorBody =
    unescape((env.PUBLIC_REPORT_OPERATOR_BODY ?? "").trim()) || defaultOperatorBody;

  // ── Transactional email templates ─────────────────────────────────
  // Helper: read an env var, unescape \n / \r / \t, fall back to default.
  const tpl = (key: string, fallback: string): string => {
    const raw = (env[key] ?? "").trim();
    return raw === "" ? fallback : unescape(raw);
  };

  const emailTemplates = {
    verification: {
      subject: tpl(
        "EMAIL_VERIFICATION_SUBJECT",
        `Verify your {registryName} account`
      ),
      body: tpl(
        "EMAIL_VERIFICATION_BODY",
        `Hi {name},\n\n` +
          `Welcome to {registryName}. Confirm your email address by opening this link:\n\n` +
          `  {verifyUrl}\n\n` +
          `The link expires in 24 hours. If you didn't request this, you can ignore this email.\n\n` +
          `- {registryName}`
      )
    },
    passwordReset: {
      subject: tpl(
        "EMAIL_PASSWORD_RESET_SUBJECT",
        `Reset your {registryName} password`
      ),
      body: tpl(
        "EMAIL_PASSWORD_RESET_BODY",
        `Hi {name},\n\n` +
          `We received a request to reset your {registryName} password. Open this link to set a new one:\n\n` +
          `  {resetUrl}\n\n` +
          `The link expires in 1 hour. If you didn't request this, ignore this email and your password will stay the same.\n\n` +
          `- {registryName}`
      )
    },
    passwordChanged: {
      subject: tpl(
        "EMAIL_PASSWORD_CHANGED_SUBJECT",
        `Your {registryName} password was changed`
      ),
      body: tpl(
        "EMAIL_PASSWORD_CHANGED_BODY",
        `Hi {name},\n\n` +
          `The password for your {registryName} account was just changed.\n\n` +
          `If this was you, no action is needed. Sign in anytime:\n\n` +
          `  {loginUrl}\n\n` +
          `If you did not change your password, reset it immediately from the sign-in page.\n\n` +
          `- {registryName}`
      )
    },
    contactConfirmation: {
      subject: tpl(
        "EMAIL_CONTACT_CONFIRMATION_SUBJECT",
        `We received your message - {registryName}`
      ),
      body: tpl(
        "EMAIL_CONTACT_CONFIRMATION_BODY",
        `Hi {senderName},\n\n` +
          `{replyIntro}\n\n` +
          `Topic: {topicLabel}\n\n` +
          `Confirm this email address (required before we treat the thread as verified):\n\n` +
          `  {verifyUrl}\n\n` +
          `The link expires in 24 hours. If you did not use the contact form on {registryName}, you can ignore this email.\n\n` +
          `- {operatorName} · {registryName}`
      )
    },
    resourceSubmittedForReview: {
      subject: tpl(
        "EMAIL_RESOURCE_SUBMITTED_SUBJECT",
        `Submitted for review - {resourceTitle}`
      ),
      body: tpl(
        "EMAIL_RESOURCE_SUBMITTED_BODY",
        `{registryName}: a resource was submitted for sovereignty review.\n\n` +
          `Resource: {resourceTitle}\n` +
          `Review id: {reviewId}\n\n` +
          `View resources:\n  {portalResourcesUrl}\n\n` +
          `Track reviews:\n  {portalReviewsUrl}\n\n` +
          `- {registryName}`
      )
    },
    reviewDecision: {
      subject: tpl(
        "EMAIL_REVIEW_DECISION_SUBJECT",
        `Review update - {resourceTitle}`
      ),
      body: tpl(
        "EMAIL_REVIEW_DECISION_BODY",
        `Hello {providerDisplayName},\n\n` +
          `{registryName} has updated the sovereignty review for "{resourceTitle}".\n\n` +
          `Outcome: {decisionLabel}\n\n` +
          `Summary:\n{decisionSummary}\n\n` +
          `Open your provider reviews:\n  {portalReviewsUrl}\n` +
          `{publicCatalogBlock}\n` +
          `- {registryName}`
      )
    },
    providerVerificationUpdate: {
      subject: tpl(
        "EMAIL_PROVIDER_VERIFICATION_SUBJECT",
        `Provider verification update - {registryName}`
      ),
      body: tpl(
        "EMAIL_PROVIDER_VERIFICATION_BODY",
        `Hello {providerDisplayName},\n\n` +
          `Your organisation's verification status on {registryName} is now: {statusLabel}.\n\n` +
          `Summary:\n{summary}\n` +
          `{noteBlock}` +
          `\nProvider settings:\n  {portalSettingsUrl}\n\n` +
          `- {registryName}`
      )
    },
    complaintReceivedComplainant: {
      subject: tpl(
        "EMAIL_COMPLAINT_RECEIVED_COMPLAINANT_SUBJECT",
        `Complaint received - {registryName}`
      ),
      body: tpl(
        "EMAIL_COMPLAINT_RECEIVED_COMPLAINANT_BODY",
        `Thank you for contacting {registryName}.\n\n` +
          `We recorded your complaint (reference: {complaintId}). ` +
          `{operatorName} will handle it according to our process.\n\n` +
          `You can reach us again via:\n  {contactUrl}\n\n` +
          `- {operatorName} · {registryName}`
      )
    },
    complaintReceivedOperator: {
      subject: tpl(
        "EMAIL_COMPLAINT_RECEIVED_OPERATOR_SUBJECT",
        `[{registryName}] New complaint {complaintId}`
      ),
      body: tpl(
        "EMAIL_COMPLAINT_RECEIVED_OPERATOR_BODY",
        `A new public complaint was filed.\n\n` +
          `Id: {complaintId}\n` +
          `Type: {complaintType}\n` +
          `Severity: {severity}\n` +
          `Target: {targetSummary}\n\n` +
          `Open the admin console:\n  {adminHomeUrl}\n\n` +
          `- {registryName} (automated)`
      )
    },
    complaintAssigned: {
      subject: tpl(
        "EMAIL_COMPLAINT_ASSIGNED_SUBJECT",
        `[{registryName}] Complaint {complaintIdShort} assigned to you`
      ),
      body: tpl(
        "EMAIL_COMPLAINT_ASSIGNED_BODY",
        `Hi {assigneeName},\n\n` +
          `{assignedByName} assigned a complaint to you on {registryName}.\n\n` +
          `Id: {complaintId}\n` +
          `Type: {complaintType}\n` +
          `Severity: {severity}\n` +
          `Status: {statusLabel}\n` +
          `Target: {targetSummary}\n\n` +
          `Excerpt:\n{excerpt}\n\n` +
          `Open the complaint:\n  {complaintUrl}\n\n` +
          `- {registryName} (automated)`
      )
    },
    userStatusChanged: {
      subject: tpl(
        "EMAIL_USER_STATUS_CHANGED_SUBJECT",
        `Your {registryName} account status has changed`
      ),
      body: tpl(
        "EMAIL_USER_STATUS_CHANGED_BODY",
        `Hi {name},\n\n` +
          `Your account on {registryName} is now: {statusLabel}.\n` +
          `{reasonBlock}` +
          `\nSign in or contact the operator if you have questions:\n  {loginUrl}\n\n` +
          `- {operatorName} · {registryName}`
      )
    },
    providerVisibilityChanged: {
      subject: tpl(
        "EMAIL_PROVIDER_VISIBILITY_SUBJECT",
        `Provider visibility update - {registryName}`
      ),
      body: tpl(
        "EMAIL_PROVIDER_VISIBILITY_BODY",
        `Hello {providerDisplayName},\n\n` +
          `Your organisation's public visibility on {registryName} is now: {visibilityLabel}.\n\n` +
          `{summary}\n\n` +
          `Provider settings:\n  {portalSettingsUrl}\n\n` +
          `- {registryName}`
      )
    },
    resourceLifecycleChanged: {
      subject: tpl(
        "EMAIL_RESOURCE_LIFECYCLE_SUBJECT",
        `Resource update - {resourceTitle}`
      ),
      body: tpl(
        "EMAIL_RESOURCE_LIFECYCLE_BODY",
        `Hello {providerDisplayName},\n\n` +
          `{registryName} has updated the lifecycle of "{resourceTitle}".\n\n` +
          `Action: {actionLabel}\n` +
          `New status: {newStatusLabel}\n\n` +
          `Reason:\n{reason}\n\n` +
          `View your resources:\n  {portalResourcesUrl}\n` +
          `{publicCatalogBlock}\n` +
          `- {registryName}`
      )
    },
    reviewThreadOpened: {
      subject: tpl(
        "EMAIL_REVIEW_THREAD_OPENED_SUBJECT",
        `New message on your review - {reviewTitle}`
      ),
      body: tpl(
        "EMAIL_REVIEW_THREAD_OPENED_BODY",
        `Hello,\n\n` +
          `A verifier has opened a conversation on your review of "{reviewTitle}".\n\n` +
          `From: {authorName}\n` +
          `Message:\n{excerpt}\n\n` +
          `Open the thread to reply:\n  {threadUrl}\n\n` +
          `- {registryName}`
      )
    },
    reviewThreadProviderReply: {
      subject: tpl(
        "EMAIL_REVIEW_THREAD_PROVIDER_REPLY_SUBJECT",
        `Provider replied - {reviewTitle}`
      ),
      body: tpl(
        "EMAIL_REVIEW_THREAD_PROVIDER_REPLY_BODY",
        `Hello,\n\n` +
          `The provider replied on the review of "{reviewTitle}".\n\n` +
          `From: {authorName}\n` +
          `Message:\n{excerpt}\n` +
          `{attachmentLine}\n` +
          `Open the thread:\n  {threadUrl}\n\n` +
          `- {registryName}`
      )
    },
    reviewThreadVerifierReply: {
      subject: tpl(
        "EMAIL_REVIEW_THREAD_VERIFIER_REPLY_SUBJECT",
        `Verifier replied - {reviewTitle}`
      ),
      body: tpl(
        "EMAIL_REVIEW_THREAD_VERIFIER_REPLY_BODY",
        `Hello,\n\n` +
          `The verifier replied on the review of "{reviewTitle}".\n\n` +
          `From: {authorName}\n` +
          `Message:\n{excerpt}\n` +
          `{attachmentLine}\n` +
          `Open the thread:\n  {threadUrl}\n\n` +
          `- {registryName}`
      )
    },
    reviewThreadResolved: {
      subject: tpl(
        "EMAIL_REVIEW_THREAD_RESOLVED_SUBJECT",
        `Review thread resolved - {reviewTitle}`
      ),
      body: tpl(
        "EMAIL_REVIEW_THREAD_RESOLVED_BODY",
        `Hello,\n\n` +
          `The conversation on the review of "{reviewTitle}" has been marked resolved.\n\n` +
          `Open the thread:\n  {threadUrl}\n\n` +
          `- {registryName}`
      )
    }
  };

  return {
    databaseUrl,
    registryName,
    portalDomain,
    apiBaseUrl,
    jurisdiction,
    identityDomain,
    operatorName,
    operatorContactEmail,
    operatorOfficeName,
    operatorOfficeAddress,
    operatorContactHours,
    jurisdictionDisplayName,
    privacyDataProtectionAct,
    openSourceRepoUrl,
    supportedLanguages,
    defaultLanguage,
    resourceTypes,
    auth: {
      secret: authSecret,
      sessionCookieName,
      sessionTtlSeconds,
      sessionTtlAdminSeconds
    },
    mail: {
      from: composeFromHeader(
        mailFrom || `no-reply@${portalDomain}`,
        senderName
      ),
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      testInbox
    },
    contactFormReplyMessage,
    operatorInboxEmail,
    publicContactUrl,
    adminHomeUrl,
    publicReportEmail: {
      ackSubject,
      ackBody,
      operatorSubject,
      operatorBody
    },
    emailTemplates
  };
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Returns the validated deployment configuration. Throws `ConfigError` on the
 * first invalid value; subsequent calls will keep throwing the cached error
 * until the process is restarted.
 */
export function getConfig(): RegistryConfig {
  if (cached) return cached;
  if (cachedError) throw cachedError;
  try {
    cached = loadFromEnv(process.env);
    return cached;
  } catch (error) {
    cachedError = error instanceof Error ? error : new Error(String(error));
    throw cachedError;
  }
}

/**
 * Test-only helper: re-evaluate the configuration from a supplied env-like
 * object. Bypasses the boot-time cache. Production code should not call this.
 */
export function loadConfigForTest(env: NodeJS.ProcessEnv): RegistryConfig {
  return loadFromEnv(env);
}
