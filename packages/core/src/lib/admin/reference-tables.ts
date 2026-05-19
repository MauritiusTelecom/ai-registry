/**
 * Reference-table registry.
 *
 * Every controlled vocabulary in the schema is described here exactly once.
 * The generic CRUD API at `/api/admin/ref/[table]/...` and the generic UI at
 * `/admin/ref/[table]/...` both read this registry - there is no per-table
 * route or per-table page. Adding a new reference table is a one-line entry
 * here plus a Prisma model on the schema; the rest is automatic.
 *
 * The runtime adapter in `src/lib/admin/ref-prisma.ts` resolves a config's
 * `modelKey` to the actual Prisma model proxy. We deliberately avoid
 * statically typing the model accessors at this layer - the pure-string
 * lookup is what lets the API and pages stay generic.
 */

export type RefFieldKind = "text" | "textarea" | "boolean" | "integer";

export type RefFieldDef = {
  key: string;
  label: string;
  kind: RefFieldKind;
  required?: boolean;
  /** Field is included in the search OR clause (case-insensitive contains). */
  searchable?: boolean;
  /** Field is unique - surfaces 409 on collision. */
  unique?: boolean;
  /** Default value when creating. */
  default?: string | number | boolean;
  /** Help text shown under the form input. */
  help?: string;
};

export type RefTableConfig = {
  /** URL slug - `/admin/ref/[id]`. */
  id: string;
  /** Sidebar label. */
  label: string;
  /** Short paragraph shown above the grid. */
  description: string;
  /** Sidebar / grouping bucket. */
  group:
    | "identity"
    | "providers"
    | "resources"
    | "endpoints"
    | "sovereignty"
    | "trust"
    | "authority"
    | "complaints";
  /** Camel-case Prisma model accessor - `userRoleType` → `prisma.userRoleType`. */
  modelKey: string;
  /** Field definitions, in form-render order. The `id` PK is implicit. */
  fields: RefFieldDef[];
  /** Default sort applied to list queries. Most tables sort by `sortOrder asc`. */
  defaultSort: { field: string; dir: "asc" | "desc" };
  /** Columns to show in the grid (subset of `fields` plus optional id). */
  gridColumns: string[];
  /** True when the table has an `active` boolean (filterable + toggleable). */
  hasActive: boolean;
  /** True when the table has a `sortOrder` integer. */
  hasSortOrder: boolean;
};

// ─── Field templates ──────────────────────────────────────────────────────

const F_CODE: RefFieldDef = {
  key: "code",
  label: "Code",
  kind: "text",
  required: true,
  searchable: true,
  unique: true,
  help: "Short stable identifier. Lowercase, snake_case."
};
const F_NAME: RefFieldDef = {
  key: "name",
  label: "Name",
  kind: "text",
  required: true,
  searchable: true
};
const F_DESC: RefFieldDef = {
  key: "description",
  label: "Description",
  kind: "textarea",
  searchable: true
};
const F_ACTIVE: RefFieldDef = {
  key: "active",
  label: "Active",
  kind: "boolean",
  default: true
};
const F_SORT: RefFieldDef = {
  key: "sortOrder",
  label: "Sort order",
  kind: "integer",
  default: 0,
  help: "Lower numbers appear first. Used by the public portal status priority."
};

// Standard shape: code / name / description / active / sortOrder.
const STD: RefFieldDef[] = [F_CODE, F_NAME, F_DESC, F_ACTIVE, F_SORT];
const STD_GRID = ["code", "name", "description", "active", "sortOrder"];
const STD_SORT = { field: "sortOrder", dir: "asc" as const };

// ─── Registry ─────────────────────────────────────────────────────────────

export const REF_TABLES: RefTableConfig[] = [
  // Identity
  std("user-role-type", "User roles", "Role codes assigned to operators across all four portals.", "identity", "userRoleType"),
  std("user-status-type", "User statuses", "Lifecycle states for user accounts.", "identity", "userStatusType"),

  // Providers
  std("provider-type", "Provider types", "Sovereign / model / hosting / integrator / research.", "providers", "providerTypeRef"),
  std("provider-status-type", "Provider statuses", "unverified · verified · official_provider · suspended.", "providers", "providerStatusType"),
  std("submission-source-type", "Submission sources", "How a provider record entered the registry.", "providers", "submissionSourceType"),

  // Resources
  std("resource-type", "Resource types", "AIR-SPEC §7 enum: model / agent / tool / skill.", "resources", "resourceType"),
  std("lifecycle-status", "Lifecycle statuses", "draft → submitted → in_review → listed (+ needs_update / suspended / deprecated / removed).", "resources", "lifecycleStatus"),
  std("risk-level", "Risk levels", "Coarse risk tier (low / medium / high) attached to every resource.", "resources", "riskLevel"),
  std("listing-origin", "Listing origins", "Local submission vs federated mirror.", "resources", "listingOrigin"),

  // Endpoints
  std("protocol", "Protocols", "Endpoint protocol vocabulary (REST / MCP / A2A / gRPC).", "endpoints", "protocol"),
  std("access-model-type", "Access models", "open · registered · approved · restricted.", "endpoints", "accessModelType"),
  std("auth-method-type", "Auth methods", "How a consumer authenticates to a provider endpoint.", "endpoints", "authMethodType"),
  std("endpoint-health-type", "Endpoint health", "Last-check status (unknown / healthy / degraded / down).", "endpoints", "endpointHealthType"),

  // Sovereignty
  std("evidence-type", "Evidence types", "Sovereignty-evidence categorisation.", "sovereignty", "evidenceType"),
  std("jurisdiction-type", "Jurisdiction types", "country / supranational / subnational.", "sovereignty", "jurisdictionType"),
  {
    id: "sovereignty-basis",
    label: "Sovereignty bases",
    description: "AIR-SPEC §7 sovereignty-basis enum (local_law / local_data / local_system / local_language_culture).",
    group: "sovereignty",
    modelKey: "sovereigntyBasis",
    fields: [F_CODE, F_NAME, F_DESC, F_ACTIVE],
    defaultSort: { field: "code", dir: "asc" },
    gridColumns: ["code", "name", "description", "active"],
    hasActive: true,
    hasSortOrder: false
  },
  {
    id: "sector",
    label: "Sectors",
    description: "National sectors a resource may serve.",
    group: "sovereignty",
    modelKey: "sector",
    fields: [F_CODE, F_NAME, F_DESC, F_ACTIVE],
    defaultSort: { field: "code", dir: "asc" },
    gridColumns: ["code", "name", "description", "active"],
    hasActive: true,
    hasSortOrder: false
  },
  {
    id: "language",
    label: "Languages",
    description: "BCP-47 language codes the deployment supports.",
    group: "sovereignty",
    modelKey: "language",
    fields: [F_CODE, F_NAME, F_ACTIVE],
    defaultSort: { field: "code", dir: "asc" },
    gridColumns: ["code", "name", "active"],
    hasActive: true,
    hasSortOrder: false
  },
  {
    id: "tag",
    label: "Tags",
    description: "Free-form tag vocabulary attached to resources.",
    group: "sovereignty",
    modelKey: "tag",
    fields: [
      { key: "name", label: "Name", kind: "text", required: true, searchable: true, unique: true },
      { key: "description", label: "Description", kind: "textarea", searchable: true }
    ],
    defaultSort: { field: "name", dir: "asc" },
    gridColumns: ["name", "description"],
    hasActive: false,
    hasSortOrder: false
  },

  // Trust signals
  std("trust-signal-type", "Trust signal types", "provider_verification / sovereignty_review / official_resource.", "trust", "trustSignalType"),
  std("trust-signal-status-type", "Trust signal statuses", "pending / passed / failed / withdrawn.", "trust", "trustSignalStatusType"),
  std("review-type", "Review types", "provider_verification / sovereignty_review / incident_review.", "trust", "reviewType"),
  std("review-status-type", "Review statuses", "open / in_review / decided / withdrawn.", "trust", "reviewStatusType"),
  std("checklist-result-type", "Checklist results", "yes / no / n_a - the §11 reviewer checklist outcomes.", "trust", "checklistResultType"),

  // Authorities
  std("official-authority-type", "Official authority types", "government / regulator / professional_body - entities that can authorise official-resource posture.", "authority", "officialAuthorityType"),
  std("official-authorisation-status-type", "Official authorisation statuses", "pending / authorised / withdrawn.", "authority", "officialAuthorisationStatusType"),

  // Complaints
  std("complaint-type", "Complaint types", "accuracy / safety / policy / other.", "complaints", "complaintType"),
  std("complaint-severity-type", "Complaint severities", "low / medium / high.", "complaints", "complaintSeverityType"),
  std("complaint-status-type", "Complaint statuses", "open / investigating / resolved / rejected.", "complaints", "complaintStatusType"),
  std("enforcement-type", "Enforcement actions", "warning / isolate / suspend / remove.", "complaints", "enforcementType")
];

function std(
  id: string,
  label: string,
  description: string,
  group: RefTableConfig["group"],
  modelKey: string
): RefTableConfig {
  return {
    id,
    label,
    description,
    group,
    modelKey,
    fields: STD,
    defaultSort: STD_SORT,
    gridColumns: STD_GRID,
    hasActive: true,
    hasSortOrder: true
  };
}

// ─── Lookup helpers ───────────────────────────────────────────────────────

const BY_ID = new Map(REF_TABLES.map((t) => [t.id, t]));

export function getRefTable(id: string): RefTableConfig | null {
  return BY_ID.get(id) ?? null;
}

export function refTablesByGroup(): { group: RefTableConfig["group"]; label: string; tables: RefTableConfig[] }[] {
  const groups: { group: RefTableConfig["group"]; label: string }[] = [
    { group: "identity", label: "Identity" },
    { group: "providers", label: "Providers" },
    { group: "resources", label: "Resources" },
    { group: "endpoints", label: "Endpoints" },
    { group: "sovereignty", label: "Sovereignty" },
    { group: "trust", label: "Trust signals" },
    { group: "authority", label: "Authorities" },
    { group: "complaints", label: "Complaints" }
  ];
  return groups.map((g) => ({
    ...g,
    tables: REF_TABLES.filter((t) => t.group === g.group)
  }));
}
