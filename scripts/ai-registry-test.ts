#!/usr/bin/env tsx
/**
 * scripts/ai-registry-test.ts
 *
 * Hierarchical UI text smoke test for the AI Registry portal.
 * Each page/section reports: "<section> present", then
 * "<section> present - <label> text present" underneath.
 *
 * Scope:
 *   - validated-text.json locks homepage sign-off copy (EN + FR)
 *   - All public routes + detail pages (when DB has listings) use en.json / fr.json via msg()
 *   - Admin / provider / verifier / sovereign sidebars when auth credentials allow
 *
 * Usage:
 *   pnpm ai_registry_test
 *   BASE=https://www.airegistry.mu pnpm ai_registry_test
 *
 * Pre-commit (via .githooks/pre-commit): PRE_COMMIT=1 TEST_SKIP_AUTH=1 pnpm ai_registry_test
 * Any FAIL blocks git commit. Portal must be running on BASE (default localhost:3002).
 *
 * Requires the app to be running.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..");

/** Minimal .env loader (scripts live outside @airegistry/portal; avoid dotenv import). */
function loadEnvFile(path: string): void {
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* no .env at this path */
  }
}

loadEnvFile(resolve(REPO_ROOT, ".env"));

const VALIDATED_TEXT_PATH = resolve(
  REPO_ROOT,
  "apps/portal/messages/validated-text.json"
);

type ValidatedLocaleCopy = Record<string, Record<string, string>>;

type ValidatedTextFile = {
  branding: {
    registryName: string;
    portalDomain: string;
    jurisdictionDisplay: string;
  };
  literals: {
    en: Record<string, string>;
    fr: Record<string, string>;
  };
  en: ValidatedLocaleCopy;
  fr: ValidatedLocaleCopy;
};

const VALIDATED_TEXT = JSON.parse(
  readFileSync(VALIDATED_TEXT_PATH, "utf8")
) as ValidatedTextFile;

const BASE = process.env.BASE?.replace(/\/+$/, "") ?? "http://localhost:3002";
const REGISTRY_NAME =
  process.env.EXPECT_REGISTRY_NAME?.trim() || VALIDATED_TEXT.branding.registryName;
const PORTAL_DOMAIN =
  process.env.EXPECT_PORTAL_DOMAIN?.trim() || VALIDATED_TEXT.branding.portalDomain;
const JURISDICTION_DISPLAY =
  process.env.EXPECT_JURISDICTION?.trim() || VALIDATED_TEXT.branding.jurisdictionDisplay;
const OPERATOR_NAME = process.env.OPERATOR_NAME?.trim() || "Mauritius Telecom";
const SKIP_AUTH = (process.env.TEST_SKIP_AUTH ?? "").toLowerCase() === "1";

/** English, French, then A–Z (matches locale-config sortUiLocales). */
function sortLanguageCodes(codes: string[]): string[] {
  const rank = (code: string) => (code === "en" ? 0 : code === "fr" ? 1 : 2);
  return [...codes].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, "en", { sensitivity: "base" });
  });
}

function parseSupportedLanguages(): string[] {
  const raw =
    process.env.SUPPORTED_LANGUAGES?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORTED_LANGUAGES?.trim() ||
    "en,fr";
  const unique = [
    ...new Set(
      raw
        .split(",")
        .map((part) => part.trim().toLowerCase().split("-")[0] ?? "")
        .filter(Boolean)
    )
  ];
  return sortLanguageCodes(unique);
}

const SUPPORTED_LANGUAGES = parseSupportedLanguages();

/** Mirrors apps/portal/src/i18n/locale-config.ts */
function localeSwitcherMode(localeCount: number): "toggle" | "modal" {
  return localeCount <= 2 ? "toggle" : "modal";
}


type PageContentKind =
  | "homepage"
  | "registry"
  | "providers"
  | "contact"
  | "docs"
  | "ecosystem"
  | "governance"
  | "login"
  | "register"
  | "pricing"
  | "privacy"
  | "terms"
  | "acceptableUse"
  | "whitepaper"
  | "openData"
  | "verification"
  | "sovereigntyRubric"
  | "auditLog"
  | "authReset"
  | "authVerify"
  | "contactVerify"
  | "registryDetail"
  | "providerDetail";

type PublicPageDef = {
  path: string;
  label: string;
  content: PageContentKind;
};

/** Every public marketing route under `(public)/` (see packages/public pages). */
const PUBLIC_PAGES: PublicPageDef[] = [
  { path: "/", label: "homepage", content: "homepage" },
  { path: "/registry", label: "registry page", content: "registry" },
  { path: "/providers", label: "providers page", content: "providers" },
  { path: "/contact", label: "contact page", content: "contact" },
  { path: "/docs", label: "docs page", content: "docs" },
  { path: "/ecosystem", label: "ecosystem page", content: "ecosystem" },
  { path: "/governance", label: "governance page", content: "governance" },
  { path: "/login", label: "login page", content: "login" },
  { path: "/register", label: "register page", content: "register" },
  { path: "/pricing", label: "pricing page", content: "pricing" },
  { path: "/privacy", label: "privacy page", content: "privacy" },
  { path: "/terms", label: "terms page", content: "terms" },
  { path: "/acceptable-use", label: "acceptable use page", content: "acceptableUse" },
  { path: "/whitepaper", label: "whitepaper page", content: "whitepaper" },
  { path: "/open-data", label: "open data page", content: "openData" },
  { path: "/verification", label: "verification page", content: "verification" },
  { path: "/sovereignty-rubric", label: "sovereignty rubric page", content: "sovereigntyRubric" },
  { path: "/audit-log", label: "audit log page", content: "auditLog" },
  { path: "/auth/reset", label: "password reset page", content: "authReset" },
  { path: "/auth/verify", label: "email verify page", content: "authVerify" },
  { path: "/contact/verify", label: "contact verify page", content: "contactVerify" }
];

/** Authenticated sessions redirect away from these routes (no public nav/footer). */
const GUEST_ONLY_PATHS = new Set(["/login", "/register"]);

const EN = JSON.parse(
  readFileSync(resolve(REPO_ROOT, "apps/portal/messages/en.json"), "utf8")
) as Record<string, Record<string, string>>;

const FR = JSON.parse(
  readFileSync(resolve(REPO_ROOT, "apps/portal/messages/fr.json"), "utf8")
) as Record<string, Record<string, string>>;

type Check = { name: string; ok: boolean; detail: string; skipped?: boolean };
const checks: Check[] = [];

function record(name: string, ok: boolean, detail: string, skipped = false): void {
  checks.push({ name, ok, detail, skipped });
}

/** Resolve ICU-ish placeholders and strip markup tags for HTML substring search. */
function plainCopy(raw: string): string {
  return raw
    .replace(/\{jurisdiction\}/gi, JURISDICTION_DISPLAY)
    .replace(/\{operatorName\}/gi, OPERATOR_NAME)
    .replace(/\{portalDomain\}/gi, PORTAL_DOMAIN)
    .replace(/\{registryName\}/gi, REGISTRY_NAME)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Match copy in SSR HTML (handles &amp;, &quot;, &#39;, &#x27;, curly quotes). */
function htmlIncludes(scope: string, text: string): boolean {
  const normalized = scope
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
  if (normalized.includes(text)) return true;
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  if (escaped !== text && scope.includes(escaped)) return true;
  if (escaped !== text && normalized.includes(escaped.replace(/&#39;/g, "'"))) return true;
  const core = text.replace(/["']/g, "").trim();
  return core.length >= 8 && normalized.includes(core);
}

let activeLocale: "en" | "fr" = "en";

function countValidatedKeys(copy: ValidatedLocaleCopy): number {
  return Object.values(copy).reduce((total, ns) => total + Object.keys(ns).length, 0);
}

function collectDrift(
  validated: ValidatedLocaleCopy,
  live: Record<string, Record<string, string>>,
  fileLabel: string
): string[] {
  const drifts: string[] = [];
  for (const [ns, keys] of Object.entries(validated)) {
    for (const [key, expected] of Object.entries(keys)) {
      const flat = `${ns}.${key}`;
      const current = live[ns]?.[key];
      if (typeof current !== "string") {
        drifts.push(`${flat} (missing in ${fileLabel})`);
      } else if (current !== expected) {
        drifts.push(`${flat}: validated "${expected}" ≠ ${fileLabel} "${current}"`);
      }
    }
  }
  return drifts;
}

/** Validated homepage copy (sign-off baseline). */
function t(ns: string, key: string): string {
  const raw = VALIDATED_TEXT[activeLocale][ns]?.[key];
  if (!raw) {
    throw new Error(`Missing validated-text.json ${activeLocale}.${ns}.${key}`);
  }
  return plainCopy(raw);
}

/** Live copy: validated-text when present, otherwise en.json / fr.json. */
function msg(ns: string, key: string): string {
  const validated = VALIDATED_TEXT[activeLocale][ns]?.[key];
  if (validated !== undefined) return plainCopy(validated);
  const live = (activeLocale === "fr" ? FR : EN)[ns]?.[key];
  if (typeof live !== "string") {
    throw new Error(`Missing copy ${activeLocale}.${ns}.${key}`);
  }
  return plainCopy(live);
}

function localizedPath(path: string, locale: "en" | "fr"): string {
  if (locale === "en") return path;
  return path === "/" ? "/fr" : `/fr${path}`;
}

function literals(): Record<string, string> {
  return VALIDATED_TEXT.literals[activeLocale];
}

function checkValidatedTextDrift(): void {
  const envRegistry = process.env.REGISTRY_NAME?.trim();
  record(
    "validated text · .env branding matches validated-text.json",
    !envRegistry || envRegistry === VALIDATED_TEXT.branding.registryName,
    envRegistry && envRegistry !== VALIDATED_TEXT.branding.registryName
      ? `REGISTRY_NAME validated "${VALIDATED_TEXT.branding.registryName}" vs .env "${envRegistry}"`
      : VALIDATED_TEXT.branding.registryName
  );

  const enDrifts = collectDrift(VALIDATED_TEXT.en, EN, "en.json");
  record(
    "validated text · en.json matches validated-text.json",
    enDrifts.length === 0,
    enDrifts.length === 0
      ? `${countValidatedKeys(VALIDATED_TEXT.en)} keys locked`
      : enDrifts.slice(0, 4).join(" | ") + (enDrifts.length > 4 ? ` | +${enDrifts.length - 4} more` : "")
  );

  const frDrifts = collectDrift(VALIDATED_TEXT.fr, FR, "fr.json");
  record(
    "validated text · fr.json matches validated-text.json",
    frDrifts.length === 0,
    frDrifts.length === 0
      ? `${countValidatedKeys(VALIDATED_TEXT.fr)} keys locked`
      : frDrifts.slice(0, 4).join(" | ") + (frDrifts.length > 4 ? ` | +${frDrifts.length - 4} more` : "")
  );
}

type TextCheck = { label: string; text: string };
type IconCheck = { label: string; test: (scope: string) => boolean };

function assertSection(
  page: string,
  section: string,
  scope: string,
  present: boolean,
  texts: TextCheck[] = [],
  icons: IconCheck[] = []
): void {
  const base = `${page} · ${section}`;
  record(`${base} present`, present, present ? "ok" : "section not found in HTML");
  if (!present) return;

  for (const icon of icons) {
    const ok = icon.test(scope);
    record(
      `${base} present - ${icon.label} present`,
      ok,
      ok ? "ok" : `missing ${icon.label}`
    );
  }
  for (const { label, text } of texts) {
    const ok = htmlIncludes(scope, text);
    record(
      `${base} present - ${label} text present`,
      ok,
      ok ? text : `expected "${text}"`
    );
  }
}

class CookieJar {
  private readonly cookies = new Map<string, string>();

  absorb(response: Response): void {
    const raw =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [];
    for (const line of raw) {
      const [pair] = line.split(";");
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
  }

  header(): string | undefined {
    if (this.cookies.size === 0) return undefined;
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function fetchText(
  path: string,
  jar?: CookieJar
): Promise<{ status: number; html: string }> {
  const headers = new Headers();
  const cookie = jar?.header();
  if (cookie) headers.set("cookie", cookie);
  const res = await fetch(`${BASE}${path}`, { headers, redirect: "follow" });
  jar?.absorb(res);
  return { status: res.status, html: await res.text() };
}

function extractNav(html: string): string | null {
  return html.match(/<nav class="nav">[\s\S]*?<\/nav>/)?.[0] ?? null;
}

function extractFooter(html: string): string | null {
  return html.match(/<footer class="footer">[\s\S]*?<\/footer>/)?.[0] ?? null;
}

function localeSwitcherLabel(currentLocale: "en" | "fr"): string {
  const prev = activeLocale;
  activeLocale = currentLocale;
  const label = t("localeSwitcher", "label");
  activeLocale = prev;
  return label;
}

function localeSwitchHint(currentLocale: "en" | "fr", otherLocale: string): string {
  const prev = activeLocale;
  activeLocale = currentLocale;
  const otherName = t("localeSwitcher", otherLocale as "en" | "fr");
  const hint = plainCopy(t("localeSwitcher", "switchTo").replace("{language}", otherName));
  activeLocale = prev;
  return hint;
}

function checkLocaleSwitcher(
  page: string,
  navHtml: string,
  currentLocale: "en" | "fr"
): void {
  const base = `${page} · nav`;
  const mode = localeSwitcherMode(SUPPORTED_LANGUAGES.length);
  const label = localeSwitcherLabel(currentLocale);
  const currentCode = currentLocale.toUpperCase();
  const otherLocale =
    SUPPORTED_LANGUAGES.find((code) => code !== currentLocale) ??
    (currentLocale === "en" ? "fr" : "en");
  const switchHint = localeSwitchHint(currentLocale, otherLocale);

  const hasControl =
    navHtml.includes(`aria-label="${label}"`) ||
    navHtml.includes('aria-label="Choose language"') ||
    navHtml.includes('aria-label="Choisir la langue"');
  record(
    `${base} present - locale switcher present`,
    hasControl,
    hasControl ? `${SUPPORTED_LANGUAGES.join(",")} (${mode})` : "missing locale control in nav"
  );
  if (!hasControl) return;

  if (mode === "toggle") {
    const codeVisible = new RegExp(`>${currentCode}</button>`, "i").test(navHtml);
    record(
      `${base} present - current locale code ${currentCode}`,
      codeVisible,
      codeVisible ? "ok" : `expected nav button text ${currentCode}`
    );
    record(
      `${base} present - toggle mode (no modal trigger)`,
      !navHtml.includes('aria-haspopup="dialog"'),
      navHtml.includes('aria-haspopup="dialog"') ? "modal trigger found" : "ok"
    );
    record(
      `${base} present - no locale select dropdown`,
      !navHtml.includes("locale-switch-select"),
      navHtml.includes("locale-switch-select") ? "select found" : "ok"
    );
    const hintOk = htmlIncludes(navHtml, switchHint);
    record(
      `${base} present - switch hint on control`,
      hintOk,
      hintOk ? switchHint : `expected title/tooltip "${switchHint}"`
    );
    return;
  }

  record(
    `${base} present - modal mode trigger`,
    navHtml.includes('aria-haspopup="dialog"'),
    navHtml.includes('aria-haspopup="dialog"') ? "ok" : "expected aria-haspopup=dialog"
  );
  record(
    `${base} present - no locale select dropdown`,
    !navHtml.includes("locale-switch-select"),
    navHtml.includes("locale-switch-select") ? "select found" : "ok"
  );
}

function checkNav(page: string, html: string, contentLocale: "en" | "fr" = "en"): void {
  const nav = extractNav(html);
  assertSection(
    page,
    "nav",
    nav ?? html,
    nav !== null,
    [
      { label: REGISTRY_NAME, text: REGISTRY_NAME },
      { label: "Home", text: msg("nav", "home") },
      { label: "Registry", text: msg("nav", "registry") },
      { label: "Providers", text: msg("nav", "providers") },
      { label: "Contact", text: msg("nav", "contact") },
      { label: "Log In", text: msg("nav", "logIn") }
    ],
    [{ label: "logo icon", test: (s) => /nav-logo-mark/.test(s) }]
  );
  if (nav) checkLocaleSwitcher(page, nav, contentLocale);
}

function checkFooter(page: string, html: string): void {
  const footer = extractFooter(html);
  assertSection(
    page,
    "footer",
    footer ?? html,
    footer !== null,
    [
      { label: REGISTRY_NAME, text: REGISTRY_NAME },
      { label: "Product column", text: msg("footer", "product") },
      { label: "Resources column", text: msg("footer", "resources") },
      { label: "Governance column", text: msg("footer", "governance") },
      { label: "Legal column", text: msg("footer", "legal") },
      { label: "Contact link", text: msg("footer", "contact") }
    ],
    [{ label: "logo icon", test: (s) => /nav-logo-mark/.test(s) }]
  );
}

function checkNavConsistent(pageLabel: string, navs: string[]): void {
  const base = `${pageLabel} · nav present - same links on every page`;
  if (navs.length < 2) {
    record(base, true, "ok", true);
    return;
  }
  const linkSet = (nav: string) => ({
    home: htmlIncludes(nav, msg("nav", "home")),
    registry: htmlIncludes(nav, msg("nav", "registry")),
    providers: htmlIncludes(nav, msg("nav", "providers")),
    contact: htmlIncludes(nav, msg("nav", "contact"))
  });
  const expected = linkSet(navs[0]!);
  const same = navs.every((nav) => {
    const links = linkSet(nav);
    return (
      links.home === expected.home &&
      links.registry === expected.registry &&
      links.providers === expected.providers &&
      links.contact === expected.contact
    );
  });
  record(base, same, same ? "ok" : "nav links differ across pages");
}

function checkRegistryPage(page: string, html: string): void {
  const present =
    html.includes(msg("registrySection", "listPageSubtitle")) ||
    html.includes(msg("registrySection", "searchPlaceholder"));
  assertSection(page, "registry content", html, present, [
    { label: "List page subtitle", text: msg("registrySection", "listPageSubtitle") },
    { label: "Search resources", text: msg("registrySection", "searchPlaceholder") },
    { label: "All resources filter", text: msg("registrySection", "allResources") }
  ]);
}

function checkProvidersPage(page: string, html: string): void {
  const present =
    html.includes(msg("providersSection", "eyebrow")) ||
    html.includes(msg("providersSection", "searchPlaceholder"));
  assertSection(page, "providers content", html, present, [
    { label: "Providers section", text: msg("providersSection", "eyebrow") },
    { label: "Search providers", text: msg("providersSection", "searchPlaceholder") },
    { label: "All providers filter", text: msg("providersSection", "allProviders") }
  ]);
}

function checkContactPage(page: string, html: string): void {
  const present = html.includes(msg("contact", "eyebrow"));
  assertSection(page, "contact section", html, present, [
    { label: "Contact eyebrow", text: msg("contact", "eyebrow") },
    { label: "Get in touch", text: activeLocale === "fr" ? "Prenez" : "Get in" },
    { label: "Full name field", text: msg("contact", "fullName") },
    { label: "Send message button", text: msg("contact", "send") },
    { label: "Office label", text: msg("contact", "office") }
  ]);
}

function checkDocsPage(page: string, html: string): void {
  assertSection(page, "docs content", html, html.includes(msg("docs", "title")), [
    { label: "Documentation title", text: msg("docs", "title") },
    { label: "Overview section", text: msg("docs", "section_overview_label") },
    { label: "AIR-ID section", text: msg("docs", "section_air-id_label") }
  ]);
}

function checkEcosystemPage(page: string, html: string): void {
  assertSection(page, "ecosystem content", html, html.includes(msg("ecosystem", "platformEyebrow")), [
    { label: "Platform eyebrow", text: msg("ecosystem", "platformEyebrow") },
    { label: "Registry points", text: msg("ecosystem", "registryPoints") },
    { label: "Operators eyebrow", text: msg("ecosystem", "operatorsEyebrow") }
  ]);
}

function checkGovernancePage(page: string, html: string): void {
  const marker = msg("governancePage", "charterTitle");
  assertSection(page, "governance content", html, html.includes(marker), [
    { label: "Governance charter", text: marker },
    { label: "Review board", text: msg("governancePage", "reviewBoardTitle") },
    { label: "Appeals", text: msg("governancePage", "appealsTitle") }
  ]);
}

function checkLoginPage(page: string, html: string): void {
  assertSection(page, "login content", html, html.includes(msg("auth", "signIn")), [
    { label: "Sign in eyebrow", text: msg("auth", "signIn") },
    { label: "Email field", text: msg("auth", "email") },
    { label: "Password field", text: msg("auth", "password") },
    { label: "Create account link", text: msg("auth", "createAccount") }
  ]);
}

function checkRegisterPage(page: string, html: string): void {
  assertSection(page, "register content", html, html.includes(msg("auth", "register")), [
    { label: "Register eyebrow", text: msg("auth", "register") },
    { label: "Full name field", text: msg("auth", "fullName") },
    { label: "Email field", text: msg("auth", "email") },
    { label: "Already registered", text: msg("auth", "alreadyRegistered") }
  ]);
}

function checkPricingPage(page: string, html: string): void {
  assertSection(page, "pricing content", html, html.includes(msg("pricing", "title")), [
    { label: "Pricing title", text: msg("pricing", "title") },
    { label: "What is free", text: msg("pricing", "whatIsFreeTitle") },
    { label: "Operator costs", text: msg("pricing", "operatorCostsTitle") }
  ]);
}

function checkPrivacyPage(page: string, html: string): void {
  assertSection(page, "privacy content", html, html.includes(msg("privacy", "title")), [
    { label: "Privacy title", text: msg("privacy", "title") },
    { label: "What we hold", text: msg("privacy", "whatWeHoldTitle") },
    { label: "Your rights", text: msg("privacy", "yourRightsTitle") }
  ]);
}

function checkTermsPage(page: string, html: string): void {
  assertSection(page, "terms content", html, html.includes(msg("terms", "registryPointsTitle")), [
    { label: "Registry points", text: msg("terms", "registryPointsTitle") },
    { label: "Listing not endorsement", text: msg("terms", "listingNotEndorsementTitle") },
    { label: "Acceptable use", text: msg("terms", "acceptableUseTitle") }
  ]);
}

function checkAcceptableUsePage(page: string, html: string): void {
  assertSection(page, "acceptable use content", html, html.includes(msg("acceptableUse", "title")), [
    { label: "Acceptable use title", text: msg("acceptableUse", "title") },
    { label: "When you submit", text: msg("acceptableUse", "whenSubmitTitle") },
    { label: "When you call APIs", text: msg("acceptableUse", "whenCallApisTitle") }
  ]);
}

function checkWhitepaperPage(page: string, html: string): void {
  assertSection(page, "whitepaper content", html, html.includes(msg("whitepaper", "whyNowTitle")), [
    { label: "Why now", text: msg("whitepaper", "whyNowTitle") },
    { label: "Discipline", text: msg("whitepaper", "disciplineTitle") },
    { label: "Governance", text: msg("whitepaper", "governanceTitle") }
  ]);
}

function checkOpenDataPage(page: string, html: string): void {
  assertSection(page, "open data content", html, html.includes(msg("openData", "title")), [
    { label: "Open data title", text: msg("openData", "title") },
    { label: "What is open", text: msg("openData", "whatIsOpenTitle") },
    { label: "Immutable audit", text: msg("openData", "immutableAuditTitle") }
  ]);
}

function checkVerificationPage(page: string, html: string): void {
  assertSection(
    page,
    "verification content",
    html,
    html.includes(msg("verification", "providerVerificationTitle")),
    [
      { label: "Provider verification", text: msg("verification", "providerVerificationTitle") },
      { label: "Sovereignty review", text: msg("verification", "sovereigntyReviewTitle") },
      { label: "Official resource", text: msg("verification", "officialResourceTitle") }
    ]
  );
}

function checkSovereigntyRubricPage(page: string, html: string): void {
  assertSection(page, "sovereignty rubric content", html, html.includes(msg("sovereigntyRubric", "fourBasesTitle")), [
    { label: "Four bases", text: msg("sovereigntyRubric", "fourBasesTitle") },
    { label: "Local law", text: msg("sovereigntyRubric", "lawName") },
    { label: "How claim reviewed", text: msg("sovereigntyRubric", "howClaimReviewedTitle") }
  ]);
}

function checkAuditLogPage(page: string, html: string): void {
  assertSection(page, "audit log content", html, html.includes(msg("publicAudit", "whatIsRecordedTitle")), [
    { label: "What is recorded", text: msg("publicAudit", "whatIsRecordedTitle") },
    { label: "Append-only", text: msg("publicAudit", "appendOnlyTitle") },
    { label: "Governance link", text: msg("publicAudit", "governanceLink") }
  ]);
}

function checkAuthResetPage(page: string, html: string): void {
  assertSection(page, "password reset content", html, html.includes(msg("auth", "resetPassword")), [
    { label: "Reset password", text: msg("auth", "resetPassword") },
    { label: "Send reset link", text: msg("auth", "sendResetLink") },
    { label: "Back to sign in", text: msg("auth", "backToSignIn") }
  ]);
}

function checkAuthVerifyPage(page: string, html: string): void {
  assertSection(page, "email verify content", html, html.includes(msg("auth", "verifyEmail2")), [
    { label: "Verify email", text: msg("auth", "verifyEmail2") },
    { label: "Send verification", text: msg("auth", "sendVerificationEmail") },
    { label: "Back to sign in", text: msg("auth", "backToSignIn") }
  ]);
}

function checkContactVerifyPage(page: string, html: string): void {
  assertSection(page, "contact verify content", html, html.includes(msg("contactVerify", "contactForm")), [
    { label: "Contact form", text: msg("contactVerify", "contactForm") },
    { label: "Back to contact", text: msg("contactVerify", "backToContact") },
    { label: "Missing link hint", text: msg("contactVerify", "missingConfirmationLink") }
  ]);
}

function checkRegistryDetailPage(page: string, html: string): void {
  assertSection(page, "registry detail content", html, html.includes(msg("registryDetail", "governance")), [
    { label: "Registry link", text: msg("registryDetail", "registryLink") },
    { label: "Governance", text: msg("registryDetail", "governance") },
    { label: "Sovereignty review", text: msg("registryDetail", "sovereigntyReview") }
  ]);
}

function checkProviderDetailPage(page: string, html: string): void {
  assertSection(page, "provider detail content", html, html.includes(msg("providerDetail", "profile")), [
    { label: "Providers link", text: msg("providerDetail", "providersLink") },
    { label: "Profile", text: msg("providerDetail", "profile") },
    { label: "Public listings", text: msg("providerDetail", "publicListings") }
  ]);
}

function checkPortalSidebar(
  page: string,
  html: string,
  role: "admin" | "provider" | "verifier" | "sovereign"
): void {
  const sidebar = html.match(/<aside class="p-sidebar">[\s\S]*?<\/aside>/)?.[0] ?? null;
  assertSection(page, "sidebar", sidebar ?? html, sidebar !== null, [
    { label: REGISTRY_NAME, text: REGISTRY_NAME },
    { label: `${role} portal label`, text: msg(role, "title") }
  ], [{ label: "logo icon", test: (s) => /p-logo-mark/.test(s) }]);
}

function runPublicPageContentChecks(page: string, html: string, def: PublicPageDef): void {
  switch (def.content) {
    case "homepage":
      runHomepageContentChecks(page, html);
      break;
    case "registry":
      checkRegistryPage(page, html);
      break;
    case "providers":
      checkProvidersPage(page, html);
      break;
    case "contact":
      checkContactPage(page, html);
      break;
    case "docs":
      checkDocsPage(page, html);
      break;
    case "ecosystem":
      checkEcosystemPage(page, html);
      break;
    case "governance":
      checkGovernancePage(page, html);
      break;
    case "login":
      checkLoginPage(page, html);
      break;
    case "register":
      checkRegisterPage(page, html);
      break;
    case "pricing":
      checkPricingPage(page, html);
      break;
    case "privacy":
      checkPrivacyPage(page, html);
      break;
    case "terms":
      checkTermsPage(page, html);
      break;
    case "acceptableUse":
      checkAcceptableUsePage(page, html);
      break;
    case "whitepaper":
      checkWhitepaperPage(page, html);
      break;
    case "openData":
      checkOpenDataPage(page, html);
      break;
    case "verification":
      checkVerificationPage(page, html);
      break;
    case "sovereigntyRubric":
      checkSovereigntyRubricPage(page, html);
      break;
    case "auditLog":
      checkAuditLogPage(page, html);
      break;
    case "authReset":
      checkAuthResetPage(page, html);
      break;
    case "authVerify":
      checkAuthVerifyPage(page, html);
      break;
    case "contactVerify":
      checkContactVerifyPage(page, html);
      break;
    case "registryDetail":
      checkRegistryDetailPage(page, html);
      break;
    case "providerDetail":
      checkProviderDetailPage(page, html);
      break;
    default:
      break;
  }
}

function runPublicShellChecks(
  page: string,
  html: string,
  contentLocale: "en" | "fr"
): void {
  checkNav(page, html, contentLocale);
  checkFooter(page, html);
}

function runHomepageContentChecks(page: string, html: string): void {
  checkHero(page, html);
  checkRegistryPreview(page, html);
  checkWhatGetsListed(page, html);
  checkListingCriteria(page, html);
  checkHowItWorks(page, html);
  checkPromo(page, html);
  checkFaq(page, html);
}

function checkHero(page: string, html: string): void {
  const hero = html.match(/<section class="hero">[\s\S]*?<\/section>/)?.[0] ?? null;
  const heroAccent =
    REGISTRY_NAME.toLowerCase().startsWith(JURISDICTION_DISPLAY.toLowerCase())
      ? REGISTRY_NAME.slice(JURISDICTION_DISPLAY.length).trim()
      : "AI Registry.";

  assertSection(
    page,
    "hero",
    hero ?? html,
    hero !== null,
    [
      { label: PORTAL_DOMAIN, text: PORTAL_DOMAIN },
      { label: JURISDICTION_DISPLAY, text: JURISDICTION_DISPLAY },
      {
        label: "AI Registry headline",
        text: heroAccent.replace(/\.$/, "") || literals().heroHeadlineSuffix
      },
      { label: "Explore Registry CTA", text: t("hero", "exploreRegistry") },
      { label: "Discover Ecosystem CTA", text: t("hero", "discoverEcosystem") }
    ],
    [
      {
        label: "Mauritius flag",
        test: (s) => s.includes('aria-label="Mauritius flag"') || s.includes("Mauritius flag")
      }
    ]
  );
}

function checkRegistryPreview(page: string, html: string): void {
  const block =
    html.match(/id="registry-section"[\s\S]*?(?=<section class="section">|$)/)?.[0] ??
    (html.includes(t("registrySection", "eyebrow")) ? html : null);
  const scope = typeof block === "string" ? block : html;
  const present = html.includes('id="registry-section"') || html.includes(t("registrySection", "eyebrow"));

  assertSection(page, "registry preview", scope, present, [
    { label: "The Registry eyebrow", text: t("registrySection", "eyebrow") },
    { label: "trust and integrate", text: literals().trustAndIntegrate },
    { label: "Search resources", text: t("registrySection", "searchPlaceholder") },
    { label: "All resources filter", text: t("registrySection", "allResources") }
  ]);
}

function checkWhatGetsListed(page: string, html: string): void {
  const present = html.includes(t("whatGetsListed", "eyebrow"));
  assertSection(page, "what gets listed", html, present, [
    { label: "What gets listed eyebrow", text: t("whatGetsListed", "eyebrow") },
    { label: "Three resource types", text: t("whatGetsListed", "heading") },
    { label: "Composable by AI", text: t("whatGetsListed", "headingAccent") },
    { label: "Models card", text: t("whatGetsListed", "modelTitle") },
    { label: "Agents card", text: t("whatGetsListed", "agentTitle") },
    { label: "Skills card", text: t("whatGetsListed", "skillTitle") }
  ]);
}

function checkListingCriteria(page: string, html: string): void {
  const present = html.includes(t("listingCriteria", "qualityTitle"));
  assertSection(page, "listing criteria", html, present, [
    { label: "Sovereignty Test eyebrow", text: t("listingCriteria", "eyebrow") },
    { label: "Quality over quantity", text: t("listingCriteria", "qualityTitle") },
    { label: "Local law basis", text: t("listingCriteria", "base1Name") },
    { label: "Local data basis", text: t("listingCriteria", "base2Name") },
    { label: "Local systems basis", text: t("listingCriteria", "base3Name") },
    { label: "Local language and culture basis", text: literals().localLanguageSnippet }
  ]);
}

function checkHowItWorks(page: string, html: string): void {
  const present = html.includes(t("howItWorks", "step1Title"));
  assertSection(page, "how it works", html, present, [
    { label: "How it works eyebrow", text: t("howItWorks", "eyebrow") },
    { label: "From submission to use", text: t("howItWorks", "heading") },
    { label: "Submit step", text: t("howItWorks", "step1Title") },
    { label: "Review step", text: t("howItWorks", "step2Title") },
    { label: "Publish step", text: t("howItWorks", "step3Title") },
    { label: "Discover step", text: t("howItWorks", "step4Title") },
    { label: "Maintain step", text: t("howItWorks", "step6Title") }
  ]);
}

function checkPromo(page: string, html: string): void {
  const promo = html.match(/<div class="promo">[\s\S]*?<\/div>/)?.[0];
  if (!promo) {
    record(`${page} · promo present`, false, "promo disabled or not rendered (check CMS)", true);
    return;
  }
  assertSection(page, "promo", promo, true, [
    { label: "Promo eyebrow", text: t("promo", "eyebrow") },
    { label: "List your sovereign AI resource", text: t("promo", "fallbackHeading") },
    { label: "Submit a Resource CTA", text: t("promo", "fallbackCtaLabel") }
  ]);
}

function checkFaq(page: string, html: string): void {
  const present = html.includes(t("faq", "heading"));
  assertSection(page, "faq", html, present, [
    { label: "FAQ eyebrow", text: t("faq", "eyebrow") },
    { label: "Frequently asked questions", text: t("faq", "heading") },
    { label: "FAQ 1 question", text: t("faq", "faq1Q") },
    { label: "FAQ 2 question", text: t("faq", "faq2Q") },
    { label: "FAQ 3 question", text: literals().faq3Snippet }
  ]);
}

async function discoverDetailPages(): Promise<PublicPageDef[]> {
  const extras: PublicPageDef[] = [];
  try {
    const resList = await fetch(`${BASE}/api/resources?limit=1`);
    if (resList.ok) {
      const body = (await resList.json()) as { rows?: { slug: string }[] };
      const slug = body.rows?.[0]?.slug;
      if (slug) {
        extras.push({
          path: `/registry/${slug}`,
          label: "registry detail page",
          content: "registryDetail"
        });
      }
    }
    const provList = await fetch(`${BASE}/api/providers?limit=1`);
    if (provList.ok) {
      const body = (await provList.json()) as { rows?: { slug: string }[] };
      const slug = body.rows?.[0]?.slug;
      if (slug) {
        extras.push({
          path: `/providers/${slug}`,
          label: "provider detail page",
          content: "providerDetail"
        });
      }
    }
  } catch {
    /* discovery optional */
  }
  if (extras.length === 0) {
    record(
      "detail pages · discovery",
      true,
      "no public registry/provider rows — detail checks skipped",
      true
    );
  }
  return extras;
}

async function runPublicPages(
  pages: PublicPageDef[],
  prefix: string,
  contentLocale: "en" | "fr",
  jar?: CookieJar
): Promise<string[]> {
  const navs: string[] = [];
  activeLocale = contentLocale;

  for (const def of pages) {
    const pageName = prefix ? `${def.label} (${prefix})` : def.label;
    if (jar && GUEST_ONLY_PATHS.has(def.path)) {
      record(`${pageName} · skipped`, true, "guest-only route when logged in", true);
      continue;
    }
    const path = localizedPath(def.path, contentLocale);
    const res = await fetchText(path, jar);
    record(
      `${pageName} · page loads`,
      res.status >= 200 && res.status < 400,
      `status=${res.status}`
    );
    if (res.status >= 400) continue;

    runPublicShellChecks(pageName, res.html, contentLocale);
    runPublicPageContentChecks(pageName, res.html, def);

    const nav = extractNav(res.html);
    if (nav) navs.push(nav);
  }

  return navs;
}

async function checkWorkspacePortal(
  label: string,
  path: string,
  role: "admin" | "provider" | "verifier" | "sovereign",
  jar: CookieJar
): Promise<void> {
  const res = await fetchText(path, jar);
  if (res.status >= 400) {
    record(
      `${label} · page loads`,
      false,
      `status=${res.status} — skipped (needs ${role} role on test account)`,
      true
    );
    return;
  }
  record(`${label} · page loads`, true, `status=${res.status}`);
  activeLocale = "en";
  checkPortalSidebar(label, res.html, role);
}

async function login(jar: CookieJar): Promise<boolean> {
  const email = process.env.TEST_LOGIN_EMAIL?.trim() || process.env.SEED_ADMIN_EMAIL?.trim();
  const password =
    process.env.TEST_LOGIN_PASSWORD?.trim() || process.env.SEED_ADMIN_PASSWORD?.trim();
  if (!email || !password) {
    record("auth · login present", false, "no credentials in env", true);
    return false;
  }
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  jar.absorb(res);
  const body = (await res.json()) as { ok?: boolean; error?: string };
  const ok = res.ok && body.ok === true;
  record("auth · login present", ok, ok ? email : `${res.status} ${body.error ?? "failed"}`);
  return ok;
}

async function assertSession(jar: CookieJar, email: string): Promise<void> {
  const headers = new Headers();
  const cookie = jar.header();
  if (cookie) headers.set("cookie", cookie);
  const res = await fetch(`${BASE}/api/auth/me`, { headers });
  jar.absorb(res);
  const body = (await res.json()) as { user: { email?: string } | null };
  const ok = res.status === 200 && body.user?.email === email;
  record(
    "auth · session present",
    ok,
    ok ? `${email} via /api/auth/me` : `user=${body.user?.email ?? "null"}`
  );
}

async function main(): Promise<void> {
  console.info(
    `→ AI Registry portal UI text test\n  BASE=${BASE}\n  VALIDATED_TEXT=${VALIDATED_TEXT_PATH}\n  REGISTRY_NAME=${REGISTRY_NAME}\n  PORTAL_DOMAIN=${PORTAL_DOMAIN}\n  SUPPORTED_LANGUAGES=${SUPPORTED_LANGUAGES.join(",")} (${localeSwitcherMode(SUPPORTED_LANGUAGES.length)})\n`
  );

  checkValidatedTextDrift();

  const health = await fetchText("/api/health").catch(() => null);
  if (!health || health.status >= 500) {
    record("server present", false, `cannot reach ${BASE}`);
    if (process.env.PRE_COMMIT === "1") {
      process.stderr.write(
        "\npre-commit: start the portal (pnpm dev → :3002) and retry commit.\n"
      );
    }
    printReport();
    process.exit(1);
  }
  record("server present", true, `health ${health.status}`);

  const detailPages = await discoverDetailPages();
  const allPublicPages = [...PUBLIC_PAGES, ...detailPages];

  const guestNavs = await runPublicPages(allPublicPages, "", "en");
  checkNavConsistent("all public pages", guestNavs);

  if (SUPPORTED_LANGUAGES.includes("fr")) {
    const frNavs = await runPublicPages(allPublicPages, "French", "fr");
    checkNavConsistent("all public pages (French)", frNavs);
  }

  if (!SKIP_AUTH) {
    const jar = new CookieJar();
    if (await login(jar)) {
      const email =
        process.env.TEST_LOGIN_EMAIL?.trim() || process.env.SEED_ADMIN_EMAIL?.trim() || "";
      await assertSession(jar, email);

      await runPublicPages(allPublicPages, "logged in", "en", jar);

      for (const [label, path, role] of [
        ["admin portal", "/admin", "admin"],
        ["provider portal", "/provider", "provider"],
        ["verifier portal", "/verifier", "verifier"],
        ["sovereign portal", "/sovereign", "sovereign"]
      ] as const) {
        await checkWorkspacePortal(label, path, role, jar);
      }
    }
  } else {
    record("auth · skipped", true, "TEST_SKIP_AUTH=1", true);
  }

  printReport();
}

function printReport(): void {
  const failed = checks.filter((c) => !c.ok && !c.skipped);
  const skipped = checks.filter((c) => c.skipped);
  for (const c of checks) {
    const tag = c.skipped ? "SKIP" : c.ok ? "PASS" : "FAIL";
    process.stdout.write(`${tag}  ${c.name} — ${c.detail}\n`);
  }
  const counted = checks.length - skipped.length;
  const passed = counted - failed.length;
  process.stdout.write(`\n${passed}/${counted} checks passed`);
  if (skipped.length > 0) process.stdout.write(` (${skipped.length} skipped)`);
  process.stdout.write("\n");
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  process.stderr.write(
    `ai_registry_test crashed: ${error instanceof Error ? error.message : error}\n`
  );
  process.exit(2);
});
