/**
 * Plugin manifest shape (DRAFT — not stable until v1.0).
 *
 * Every AI Registry extension ships an `airegistry-plugin.json` at its
 * package root that conforms to PluginManifest. The core loader reads the
 * manifest, validates it, and installs the declared hooks into the running
 * registry.
 *
 * Scope rules enforced at load time (mirror of GOVERNANCE.md §3 for plugins):
 *
 *   - REST routes are namespaced under /api/ext/<plugin-id>/...; the core
 *     /api surface is never extensible.
 *   - MCP tools are namespaced ext.<plugin-id>.*; the core registry.* tools
 *     are never extensible.
 *   - Schema additions land in a dedicated `ext_<plugin-id>` PostgreSQL
 *     schema; the core `registry` schema is never mutated by a plugin.
 *   - Governance writes must go through the core audit primitive; plugins
 *     cannot write to AuditLog directly.
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
  /** Audit event subscriptions (e.g. "resource.published", "provider.verified"). */
  events?: string[];
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
