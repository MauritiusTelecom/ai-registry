# Extension-Point Design

**Status:** Draft for discussion
**Owners:** Core team
**Companion docs:** [`migration-plan.md`](./migration-plan.md), [`open-source-readiness.md`](./open-source-readiness.md)
**Aligns with:** `ai-registry-specs/.speckit/constitution.md` (§1, §3, §7)

## 1. Goal

Define the contract by which third-party code can extend AIRegistry **without** modifying `packages/core` or `apps/portal`. The bar is: a contributor builds a plugin, ships it as a versioned package, and the running instance loads it after a config change — no fork required.

This document is normative for what an extension can do, what it cannot do, and what the runtime promises in return.

## 2. Non-goals

- Not a marketplace. Distribution is out of scope; we only define the contract.
- Not a multi-tenant sandbox. Extensions run in-process with the same trust level as core. Hostile code is not in the threat model — operator review is.
- Not a UI theme system. Visual customization is a separate concern (see §10 future work).
- Not schema-mutation. Extensions never alter the core Prisma schema; they get their own namespaced schema (see §6.4).

## 3. What already exists in the SDK

The plugin contract types are already exported from `@airegistry/sdk` (`packages/sdk/src/plugin.ts`):

- `PluginManifest` — top-level descriptor
- `PluginRestRoute` — REST extension
- `PluginMcpTool` — MCP tool extension
- `PluginCronJob` — scheduled extension
- `PluginUiSlot` — UI slot extension
- `PluginPermission` — required capability declaration
- `PluginLocaleBundle` — i18n bundle

What is **missing** and this document specifies:

1. The runtime that loads manifests (`packages/plugin-host`).
2. The extension-point catalog (which slots, hooks, and adapters core actually exposes).
3. The capability/permission system and how it gates extension access.
4. The schema-extension story (the `ext_<plugin-id>` namespace contract).
5. Lifecycle, error isolation, and version-compatibility rules.

## 4. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  apps/portal  (mounts packages/public)                      │
│  - reads UI slot registrations from plugin-host             │
│  - renders <Slot id="..."/> at known points                 │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ slot registry, route registry, audit hooks
               ▼
┌─────────────────────────────────────────────────────────────┐
│  packages/plugin-host  (NEW)                                │
│  - loads PluginManifest at startup                          │
│  - validates against core-range (semver)                    │
│  - registers routes, MCP tools, cron, UI slots              │
│  - enforces permission grants                               │
│  - exposes typed hooks back into core                       │
└──────────────┬──────────────────────────────────────────────┘
               │  consumes only @airegistry/sdk
               ▼
┌─────────────────────────────────────────────────────────────┐
│  packages/sdk         packages/core                         │
│  (public contract) ←  (kernel: audit, auth, governance,     │
│                        discovery, validators, prisma)       │
└─────────────────────────────────────────────────────────────┘
```

Two rules:

1. **Extensions import only from `@airegistry/sdk`.** Imports from `@airegistry/core` are forbidden by lint rule.
2. **The host is the only thing that imports both.** The host bridges SDK surface to core internals.

## 5. Extension-point catalog

This is the canonical list. Adding a new extension point is a core change, not an extension.

### 5.1 REST extension points

Already typed as `PluginRestRoute`. Mounting rules:

- All plugin routes mount under `/api/ext/<plugin-id>/...`. Core API namespace (`/api/v1/...`) is reserved per AIR-SPEC.
- Handlers receive a `RequestContext` that contains the authenticated `SessionUser` (if any), a `db` handle scoped to the plugin's `ext_<plugin-id>` schema, an `audit` function, and a `core` read-only facade exposing the SDK serializers.
- Handlers cannot write to core tables directly. Writes go through core service functions exposed in the SDK (e.g. `core.audit.write(...)`, `core.governance.recordReview(...)`).

### 5.2 MCP tool extension points

Already typed as `PluginMcpTool`. Tools are namespaced `ext.<plugin-id>.<tool-name>`. Same context object as REST; same write rules. Useful for surfacing extension-managed data to MCP clients without forking the MCP surface.

### 5.3 Cron / scheduled extension points

Already typed as `PluginCronJob`. The host runs them on a single elected node. Job handlers receive the same `RequestContext` shape but with no `SessionUser` — they run as a system principal whose actions audit with `actorUserId: null` and a synthetic actor string `"plugin:<plugin-id>"`.

### 5.4 UI slot extension points

`PluginUiSlot` references a `slotId`. The following slot IDs are guaranteed by core:

| Slot ID                                | Where rendered                                            | Multiple allowed? |
|----------------------------------------|-----------------------------------------------------------|-------------------|
| `public.home.hero.below`               | Public home page, beneath the hero                        | Yes               |
| `public.registry.card.badges`          | Per-card on the registry list, additional badges          | Yes               |
| `public.registry.detail.panels`        | Resource detail page, additional panel sections           | Yes               |
| `public.governance.sections`           | Governance page, additional collapsible sections          | Yes               |
| `portal.sidebar.{role}.groups`         | Sidebar of admin/provider/verifier/sovereign portals      | Yes               |
| `portal.{role}.dashboard.widgets`      | Dashboard widget grid per role                            | Yes               |
| `portal.resource.detail.tabs`          | Resource detail tab strip inside any portal               | Yes               |
| `portal.review.checklist.items`        | Verifier review checklist, additional items               | Yes               |
| `portal.sovereign.evidence.types`      | Sovereign portal evidence type registry                   | Yes               |

Each slot has a typed contract — a `SlotProps` interface the host passes to the slot renderer. Adding a slot ID is a core change; extensions cannot create new slot IDs.

Rendering rule: slot widgets are React components, rendered server-side where the host page supports it, and isolated by an `ErrorBoundary` so a single failing widget does not break the page. Failures audit as `entityType: "Plugin", action: "ui-slot-error"`.

### 5.5 Validator extension points

Core validators (`isSlug`, `isHttpUrl`, `isAirId`, `isPublicHttpUrl`) are stable. Extensions can register **additional** validators for fields with extension-managed data, scoped to their `ext_<plugin-id>` schema. They cannot replace or override core validators.

Manifest entry:

```ts
manifest.validators = [
  { fieldRef: "ext_acme.resource.acme_id", validatorId: "acmeIdFormat" }
]
```

### 5.6 Discovery serializer wrappers

Core serializers (`toRegistryCard`, `toRegistryCardDetail`, `toPublicProviderCard`) define what leaves the database. Extensions can **append** fields under a namespaced key — they cannot remove or rewrite core fields.

```ts
manifest.discovery = {
  wrap: "RegistryCardDetail",
  contributor: "augmentDetail",  // export name in the plugin
  fields: ["acme.score", "acme.lastChecked"]
}
```

The host enforces: the output of `augmentDetail` is merged onto a reserved `ext` namespace on the response: `{ ...coreFields, ext: { acme: { score, lastChecked } } }`. Constitution §6 (current-public-face) still applies — wrapped values must respect lifecycle and visibility gates set by core.

### 5.7 Audit event consumers

Extensions can subscribe to audit events (write-through, never write-blocking):

```ts
manifest.events = [
  { on: "AuditLog.created", entityType: "Resource", handler: "onResourceAudit" }
]
```

Handlers run async after the core audit row is committed. They cannot veto, only react. Backpressure: a slow handler does not delay core writes; the host buffers and drops if the queue is saturated (configurable), surfacing the drop in operator metrics.

### 5.8 Schema side-tables (extension-owned data)

Extensions get an isolated PostgreSQL schema named `ext_<plugin-id>`. They ship their own Prisma schema fragment in the manifest:

```ts
manifest.prismaSchema = "./prisma/schema.prisma"  // uses schema `ext_acme`
```

The host runs migrations for that schema on startup if `migrations.auto = true`, else surfaces a pending-migration banner to operators.

Foreign keys **out** of `ext_<plugin-id>` into core (`registry.Resource.id` etc.) are allowed but advisory-only — core never enforces them on its writes. The reverse direction (core FKs into ext) is forbidden.

## 6. Capability / permission system

Every extension declares the capabilities it needs. The runtime grants only declared capabilities. Operators see the request at install time.

```ts
manifest.permissions = [
  "audit:read",          // read AuditLog rows
  "audit:write",         // write audit rows via SDK
  "resource:read",       // read public resource view
  "resource:read:full",  // read internalNote etc. — operator-gated
  "review:write",        // record review decisions
  "ui:slot:portal.*",    // render in any portal slot
  "rest:mount",          // mount REST routes
  "mcp:tool",            // register MCP tools
  "cron:job",            // register cron jobs
  "ext-schema:rw",       // own a Postgres schema
  "email:send"           // send transactional email
]
```

Capabilities not declared in the manifest cause runtime errors when the host attempts to grant them. This is the primary defense against scope creep.

**Separation-of-duties applies to extensions too.** An extension calling `core.governance.recordReview()` triggers `assertCanReview(actor, target)` exactly like a human user. There is no privileged bypass.

## 7. Manifest schema (canonical example)

```ts
import type { PluginManifest } from "@airegistry/sdk";

export default {
  id: "acme-trust-score",
  name: "ACME Trust Score",
  version: "1.2.0",
  license: "Apache-2.0",
  maintainer: { name: "ACME Labs", url: "https://acme.example" },
  coreRange: "^1.0.0",
  permissions: [
    "resource:read",
    "audit:write",
    "ext-schema:rw",
    "ui:slot:public.registry.card.badges",
    "ui:slot:portal.resource.detail.tabs",
    "cron:job"
  ],
  rest: [
    { method: "GET", path: "/score/:airId", handler: "getScore" }
  ],
  cron: [
    { id: "rescore-nightly", schedule: "0 3 * * *", handler: "rescoreAll" }
  ],
  ui: [
    { slotId: "public.registry.card.badges", component: "ScoreBadge" },
    { slotId: "portal.resource.detail.tabs", component: "ScoreTab" }
  ],
  discovery: {
    wrap: "RegistryCard",
    contributor: "augmentCard",
    fields: ["acme.score"]
  },
  events: [
    { on: "AuditLog.created", entityType: "Review", handler: "onReviewWritten" }
  ],
  prismaSchema: "./prisma/schema.prisma",
  locales: [
    { lang: "en", bundle: "./locales/en.json" },
    { lang: "fr", bundle: "./locales/fr.json" }
  ]
} satisfies PluginManifest;
```

## 8. Lifecycle

```
discover  → validate  → install  → enable  → run  → disable  → uninstall
```

- **Discover**: host scans `extensions/` and a configured registry URL list at startup.
- **Validate**: manifest parsed, `coreRange` satisfied against running core version, capabilities legal, slot IDs known.
- **Install**: ext schema created if missing, migrations applied (or operator-gated).
- **Enable**: routes mounted, MCP tools registered, cron scheduled, UI slot map updated. Audit row written: `entityType: "Plugin", action: "enable"`.
- **Run**: normal operation. Failures isolated.
- **Disable**: routes unmounted, cron paused. Data retained.
- **Uninstall**: operator-confirmed. Ext schema dropped (or detached, per config).

State changes always audit.

## 9. Error isolation & operator visibility

- A failing UI slot renders an inline error box and continues the page.
- A failing REST handler returns HTTP 502 from `/api/ext/...` and audits.
- A failing cron job retries with backoff; persistent failure pages the operator.
- A failing audit consumer is dropped after backoff; metrics surface the drop.
- Every plugin error increments a per-plugin error counter exposed at `/admin/plugins`.

## 10. Open questions / future work

- **UI theming**: should plugins ship CSS tokens, or is design-system control reserved to core? Recommendation: reserved, revisit in v2.
- **Marketplace / discovery URL list**: leave to operators in v1.
- **Hot reload**: out of scope for v1; require restart.
- **Cross-plugin dependencies**: discouraged; if needed, declare in manifest `requires: ["other-plugin@^1"]` and host resolves load order.
- **Federation extensions** (constitution §4): when federation lands, define a federation-source extension point analogous to discovery serializer wrappers.

## 11. Acceptance criteria (when is this design done)

1. `packages/plugin-host` exists and loads a hello-world plugin from `extensions/examples/hello/`.
2. Plugin can mount a REST route, register a UI slot, and write to its own schema.
3. Capability denial blocks an undeclared permission at runtime with a clear error.
4. Disabling the plugin removes the slot, route, and cron without restarting core.
5. The example plugin is documented end-to-end in `docs/open-source/writing-an-extension.md` (separate doc, future work).

---

**Next:** see [`migration-plan.md`](./migration-plan.md) for how to land the structural changes without breaking the running app.
