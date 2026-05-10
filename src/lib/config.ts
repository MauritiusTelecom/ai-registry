/**
 * Deployment configuration.
 *
 * Reads required environment variables at boot, validates them, and exposes a
 * typed object the rest of the application can consume. Keeping these values
 * in one module is what lets the codebase remain jurisdiction-agnostic — there
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
    /** Session lifetime in seconds. */
    sessionTtlSeconds: number;
  };
  /** Outbound mail (Phase 2). All SMTP fields optional — when unset the email
   * helper logs links to the console (dev fallback). */
  mail: {
    from: string;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpPass: string | null;
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
  // Light BCP-47 sanity check: lowercase 2–8 letters, optionally followed by
  // `-XX` region or other subtags. Strict validation is out of scope.
  if (!/^[a-z]{2,8}(-[A-Za-z0-9]{2,8})*$/.test(code)) {
    throw new ConfigError(
      `Language code "${code}" does not look like a BCP-47 tag (expected e.g. "en", "fr", "mfe", "en-US").`
    );
  }
  return code;
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
  if (authSecret.length < 16 || /^replace-with/.test(authSecret)) {
    throw new ConfigError(
      "AUTH_SECRET must be at least 16 characters and not the placeholder value. " +
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

  // ── Mail (Phase 2) ─────────────────────────────────────────────────────
  const mailFrom = (env.MAIL_FROM ?? "").trim();
  if (mailFrom !== "" && !/^\S+@\S+\.\S+$/.test(mailFrom)) {
    throw new ConfigError(`MAIL_FROM must be a valid email address (got "${mailFrom}").`);
  }
  const smtpHost = (env.SMTP_HOST ?? "").trim() || null;
  const smtpPortRaw = (env.SMTP_PORT ?? "").trim();
  const smtpPort = smtpPortRaw === "" ? null : Number.parseInt(smtpPortRaw, 10);
  if (smtpPort !== null && (!Number.isFinite(smtpPort) || smtpPort < 1 || smtpPort > 65535)) {
    throw new ConfigError(`SMTP_PORT must be a valid TCP port (got "${smtpPortRaw}").`);
  }
  const smtpUser = (env.SMTP_USER ?? "").trim() || null;
  const smtpPass = (env.SMTP_PASS ?? "").trim() || null;

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

  return {
    databaseUrl,
    registryName,
    portalDomain,
    apiBaseUrl,
    jurisdiction,
    identityDomain,
    operatorName,
    supportedLanguages,
    defaultLanguage,
    resourceTypes,
    auth: {
      secret: authSecret,
      sessionCookieName,
      sessionTtlSeconds
    },
    mail: {
      from: mailFrom || `no-reply@${portalDomain}`,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass
    },
    contactFormReplyMessage,
    operatorInboxEmail
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
