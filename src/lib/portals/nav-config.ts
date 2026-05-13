import { REF_TABLES } from "@/lib/admin/reference-tables";

/**
 * Sidebar navigation configuration per portal role.
 *
 * Each entry maps a role to its sidebar items. Items reference Next.js routes
 * directly (no hash routing - the portals are server-rendered Next pages).
 *
 * The set mirrors `ai-registry-prototype/claudedesign/portals/<role>-app.jsx`
 * so the implementation stays close to the prototype's information
 * architecture. Sub-routes the spec defines but Phase 4 will fully wire are
 * still listed so the sidebar shows the expected shape today.
 */

export type PortalRole = "admin" | "provider" | "verifier" | "sovereign";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  /** Phase 4 stub flag - surfaces a "Coming in Phase 4" note when true. */
  stub?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
  /** When true the group's header acts as a toggle that hides / reveals the
   *  items beneath it. Useful for long, infrequently-used groups (e.g. the
   *  ~30-row Reference Tables list). */
  collapsible?: boolean;
  /** Initial state when the user has no persisted choice. Only meaningful
   *  alongside `collapsible: true`. The sidebar always auto-expands when the
   *  active route is one of the group's items, regardless of this default. */
  defaultCollapsed?: boolean;
};

export type PortalConfig = {
  role: PortalRole;
  label: string;
  basePath: string;
  icon: string;
  groups: NavGroup[];
};

export const PORTAL_CONFIGS: Record<PortalRole, PortalConfig> = {
  admin: {
    role: "admin",
    label: "Admin",
    basePath: "/admin",
    icon: "shield",
    groups: [
      {
        id: "overview",
        label: "Overview",
        items: [
          { id: "dashboard", label: "Dashboard", href: "/admin", icon: "home-alt" },
          { id: "audit", label: "Audit log", href: "/admin/audit", icon: "audit" }
        ]
      },
      {
        id: "catalogue",
        label: "Catalogue",
        items: [
          { id: "resources", label: "Resources", href: "/admin/resources", icon: "layers" },
          { id: "providers", label: "Providers", href: "/admin/providers", icon: "users" }
        ]
      },
      {
        id: "governance",
        label: "Governance",
        items: [
          { id: "reviews", label: "Reviews", href: "/admin/reviews", icon: "check" },
          { id: "flags", label: "Flags", href: "/admin/flags", icon: "flag" },
          { id: "policies", label: "Policies", href: "/admin/policies", icon: "doc" }
        ]
      },
      {
        // ─── Inbox ──────────────────────────────────────────────
        // Public-facing intake the operator needs to triage. Complaints come
        // from the public registry's "Report" form (Complaint table) and
        // Contact messages from the public /contact form (Contact table).
        // Both surfaces support view, reply (email), and status management.
        id: "inbox",
        label: "Inbox",
        items: [
          { id: "complaints", label: "Complaints", href: "/admin/complaints", icon: "flag" },
          { id: "contacts", label: "Contact messages", href: "/admin/contacts", icon: "inbox" }
        ]
      },
      {
        id: "operations",
        label: "Operations",
        items: [
          { id: "users", label: "Users & roles", href: "/admin/users", icon: "user" },
          { id: "integrations", label: "Integrations", href: "/admin/integrations", icon: "flow" },
          { id: "settings", label: "Settings", href: "/admin/settings", icon: "settings" }
        ]
      },
      {
        id: "ref-tables",
        label: "Reference Tables",
        // The full registry - one row per controlled vocabulary the schema
        // ships. Every entry routes to /admin/ref/[id] and renders the same
        // generic CRUD grid (search, active filter, server-side pagination,
        // view/edit/delete row icons + Add new top-right). Adding a new
        // reference table is a one-line change in
        // src/lib/admin/reference-tables.ts and it shows up here automatically.
        //
        // The group is collapsible and starts collapsed by default - there
        // are ~30 rows here and most admins reach this surface only when
        // tweaking taxonomies. The PortalSidebar auto-expands when the
        // active route is `/admin/ref/...`.
        collapsible: true,
        defaultCollapsed: true,
        items: [
          { id: "ref-index", label: "All tables", href: "/admin/ref", icon: "database" },
          ...REF_TABLES.map((t) => ({
            id: `ref-${t.id}`,
            label: t.label,
            href: `/admin/ref/${t.id}`,
            icon: "database"
          }))
        ]
      }
    ]
  },
  provider: {
    role: "provider",
    label: "Provider",
    basePath: "/provider",
    icon: "layers",
    // Mirrors the Verifier portal's 4-group structure (Overview / <work> /
    // Inbox / Account). The Inbox group surfaces everything *directed at*
    // this provider - complaints, contact requests, reviews, incidents -
    // so the provider has a single landing for "the public is talking to me".
    groups: [
      {
        id: "overview",
        label: "Overview",
        items: [
          { id: "dashboard", label: "Dashboard", href: "/provider", icon: "home-alt" }
        ]
      },
      {
        id: "catalogue",
        label: "Catalogue",
        items: [
          { id: "resources", label: "Resources", href: "/provider/resources", icon: "layers" },
          { id: "submissions", label: "Submissions", href: "/provider/submissions", icon: "inbox" },
          { id: "publish", label: "Publish new", href: "/provider/publish", icon: "plus" }
        ]
      },
      {
        id: "inbox",
        label: "Inbox",
        items: [
          { id: "complaints", label: "Complaints", href: "/provider/complaints", icon: "flag" },
          { id: "contacts", label: "Contact requests", href: "/provider/contact-requests", icon: "inbox" },
          { id: "reviews", label: "Reviews", href: "/provider/reviews", icon: "check" },
          { id: "incidents", label: "Incidents", href: "/provider/incidents", icon: "shield" }
        ]
      },
      {
        id: "account",
        label: "Account",
        items: [
          { id: "analytics", label: "Analytics", href: "/provider/analytics", icon: "activity" },
          { id: "settings", label: "Settings", href: "/provider/settings", icon: "settings" }
        ]
      }
    ]
  },
  verifier: {
    role: "verifier",
    label: "Verifier",
    basePath: "/verifier",
    icon: "check",
    groups: [
      {
        id: "overview",
        label: "Overview",
        items: [
          { id: "dashboard", label: "Dashboard", href: "/verifier", icon: "home-alt" }
        ]
      },
      {
        id: "review",
        label: "Review",
        items: [
          { id: "queue", label: "Queue", href: "/verifier/queue", icon: "inbox" },
          { id: "decided", label: "Decided", href: "/verifier/decided", icon: "check" }
        ]
      },
      {
        id: "evidence",
        label: "Evidence",
        items: [
          { id: "runs", label: "Eval runs", href: "/verifier/runs", icon: "pulse" },
          { id: "benchmarks", label: "Benchmarks", href: "/verifier/benchmarks", icon: "activity" },
          { id: "redteam", label: "Red team", href: "/verifier/redteam", icon: "shield" }
        ]
      },
      {
        id: "outputs",
        label: "Outputs",
        items: [
          { id: "reports", label: "Reports", href: "/verifier/reports", icon: "doc" },
          { id: "settings", label: "Settings", href: "/verifier/settings", icon: "settings" }
        ]
      }
    ]
  },
  sovereign: {
    role: "sovereign",
    label: "Sovereign Ops",
    basePath: "/sovereign",
    icon: "flag",
    groups: [
      {
        id: "overview",
        label: "Overview",
        items: [
          { id: "dashboard", label: "Dashboard", href: "/sovereign", icon: "home-alt" }
        ]
      },
      {
        id: "ecosystem",
        label: "Ecosystem",
        items: [
          { id: "catalog", label: "National catalogue", href: "/sovereign/catalog", icon: "layers" },
          { id: "topology", label: "Topology", href: "/sovereign/topology", icon: "flow" },
          { id: "sectors", label: "Sectors", href: "/sovereign/sectors", icon: "database" },
          { id: "partners", label: "Partners", href: "/sovereign/partners", icon: "users" }
        ]
      },
      {
        id: "governance",
        label: "Governance",
        items: [
          { id: "risk", label: "Risk", href: "/sovereign/risk", icon: "shield" },
          { id: "policies", label: "Policies", href: "/sovereign/policies", icon: "doc" },
          { id: "incidents", label: "Incidents", href: "/sovereign/incidents", icon: "flag" }
        ]
      },
      {
        id: "outputs",
        label: "Outputs",
        items: [
          { id: "reports", label: "Reports", href: "/sovereign/reports", icon: "doc" },
          { id: "settings", label: "Settings", href: "/sovereign/settings", icon: "settings" }
        ]
      }
    ]
  }
};
