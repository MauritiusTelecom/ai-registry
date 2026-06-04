/**
 * Plugin manifest shape (DRAFT — not stable until v1.0).
 */

export type SemVer = `${number}.${number}.${number}` | `${number}.${number}.${number}-${string}`;

export type PluginManifest = {
  /** Reverse-DNS-ish plugin identifier. Lowercase, kebab-case, dot-separated. */
  id: string;
  /** Display name. */
  name: string;
  /** Plugin version (SemVer). */
  version: SemVer;
  /** SPDX license identifier (e.g. "Apache-2.0", "MIT"). */
  license: string;
  /** Maintainer contact (email or URL). */
  maintainer: string;
  /** Range of @airegistry/core versions this plugin supports, npm-style. */
  coreRange: string;
  /** Short prose description; surfaced in the admin plugin listing. */
  description?: string;
  /** Optional homepage / repository URL. */
  homepage?: string;
  /** REST handlers to register under /api/ext/<id>/. */
  rest?: PluginRestRoute[];
  /** MCP tools to expose under ext.<id>.* on /api/mcp. */
  mcp?: PluginMcpTool[];
  /** Background / scheduled jobs. */
  cron?: PluginCronJob[];
  /** UI contributions (slots, nav items, dashboard widgets). */
  ui?: PluginUiSlot[];
  /** New capability strings the admin UI may grant to roles. */
  permissions?: PluginPermission[];
  /** Additional BCP-47 locale dictionaries layered over SUPPORTED_LANGUAGES. */
  locales?: PluginLocaleBundle[];
  /** Audit event subscriptions. */
  events?: string[];
  /** Provider verification requirements this extension contributes.
   *  See docs/specs/multi-requirement-verification.md. */
  verificationRequirements?: PluginVerificationRequirement[];
  /** Resource-level requirements this extension contributes — extra
   *  details/documents an individual resource must satisfy (and an admin must
   *  verify) before it is publicly listed. The resource-level analog of
   *  verificationRequirements. */
  resourceRequirements?: PluginResourceRequirement[];
};

export type PluginResourceRequirement = {
  /** Stable code within the extension (e.g. "dpia", "iso-27001"). */
  code: string;
  /** Human-readable label shown to providers + verifiers. */
  label: string;
  /** Conditions that select which resources this requirement applies to.
   *  Empty object = every resource. Conditions are AND-combined; arrays OR. */
  appliesWhen?: PluginResourceApplicability;
  /** Hint for the admin UI: which evidence/document class best supports this. */
  documentTypeHint?: string;
};

export type PluginResourceApplicability = {
  /** Jurisdiction codes (e.g. "MU", "RW"). The resource's provider home
   *  jurisdiction must match one. Omit for "any jurisdiction". */
  providerJurisdiction?: string[];
  /** Sector codes. The resource itself must be tagged with at least one of
   *  these sectors. Omit for "any sector". */
  resourceSectors?: string[];
  /** Resource type codes (model | agent | tool | skill). Omit for "any kind". */
  resourceKinds?: string[];
};

export type PluginVerificationRequirement = {
  /** Stable code within the extension (e.g. "brn", "bom-license"). */
  code: string;
  /** Human-readable label shown to providers + verifiers. */
  label: string;
  /** Conditions that select which providers this requirement applies to.
   *  Empty object = applies to every provider. All listed conditions are
   *  AND-combined; within each array, OR. */
  appliesWhen?: PluginVerificationApplicability;
  /** Hint for the admin UI: which ProviderDocumentType code best matches
   *  the supporting document for this requirement (e.g. "company_registration"). */
  documentTypeHint?: string;
};

export type PluginVerificationApplicability = {
  /** Jurisdiction codes (e.g. "MU", "RW"). Provider's homeJurisdiction
   *  must match one of them. Omit for "any jurisdiction". */
  providerJurisdiction?: string[];
  /** Sector codes (e.g. "finance", "health"). Provider must have at least
   *  one resource in any of these sectors. Omit for "any sector". */
  providerSectors?: string[];
  /** Provider type codes (e.g. "sovereign_operator", "private"). Provider's
   *  type code must match one of them. Omit for "any type". */
  providerKinds?: string[];
};

export type PluginRestRoute = {
  /** Path under /api/ext/<plugin-id>. Must start with "/". */
  path: string;
  /** HTTP methods this route accepts. */
  methods: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
  /** Handler module path relative to the plugin package root. */
  handler: string;
  /** Capability the caller must hold; omit for public routes. */
  requiresPermission?: string;
};

export type PluginMcpTool = {
  /** Tool name; will be exposed as ext.<plugin-id>.<name> on /api/mcp. */
  name: string;
  /** Handler module path relative to the plugin package root. */
  handler: string;
  /** Capability the caller must hold; omit for public tools. */
  requiresPermission?: string;
};

export type PluginCronJob = {
  /** Job identifier (unique within the plugin). */
  id: string;
  /** Cron expression (UTC). */
  schedule: string;
  /** Handler module path relative to the plugin package root. */
  handler: string;
};

export type PluginUiSlot = {
  /** Registered slot id, e.g. "public.home.hero", "admin.dashboard.widgets". */
  slotId: string;
  /** Component module path relative to the plugin package root. */
  component: string;
  /** Sort priority for slots that allow multiple contributions; lower first. */
  order?: number;
};

export type PluginPermission = {
  /** Capability string (e.g. "ext.federation.read"). */
  code: string;
  /** Human description shown in the admin role editor. */
  description: string;
};

export type PluginLocaleBundle = {
  /** BCP-47 language code. */
  lang: string;
  /** Path to the JSON dictionary relative to the plugin package root. */
  path: string;
};
