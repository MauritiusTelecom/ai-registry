import { REF_TABLES } from "@airegistry/sdk";

/**
 * Sidebar navigation configuration per portal role.
 *
 * Each entry maps a role to its sidebar items. Items reference Next.js routes
 * directly (no hash routing - the portals are server-rendered Next pages).
 *
 * `label` values are translation key identifiers resolved at render time by
 * PortalSidebar via `useTranslations("<role>Nav")`. Dynamic items (e.g.
 * reference tables) carry `rawLabel` instead, which the sidebar renders as-is.
 *
 * The set mirrors `ai-registry-prototype/claudedesign/portals/<role>-app.jsx`
 * so the implementation stays close to the prototype's information
 * architecture. Sub-routes the spec defines but Phase 4 will fully wire are
 * still listed so the sidebar shows the expected shape today.
 */

export type PortalRole = "admin" | "provider" | "verifier" | "sovereign";

export type NavItem = {
  id: string;
  /** Translation key within the role's nav namespace (e.g. adminNav.dashboard). */
  label: string;
  /** Raw label for dynamic items that bypass translation (e.g. ref table names). */
  rawLabel?: string;
  href: string;
  icon: string;
  /** Phase 4 stub flag - surfaces a "Coming in Phase 4" note when true. */
  stub?: boolean;
};

export type NavGroup = {
  id: string;
  /** Translation key within the role's nav namespace. */
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
    label: "admin",
    basePath: "/admin",
    icon: "shield",
    groups: [
      {
        id: "overview",
        label: "overview",
        items: [
          { id: "dashboard", label: "dashboard", href: "/admin", icon: "home-alt" },
          { id: "audit", label: "auditLog", href: "/admin/audit", icon: "audit" }
        ]
      },
      {
        id: "catalogue",
        label: "catalogue",
        items: [
          { id: "resources", label: "resources", href: "/admin/resources", icon: "layers" },
          { id: "providers", label: "providers", href: "/admin/providers", icon: "users" }
        ]
      },
      {
        id: "governance",
        label: "governance",
        items: [
          { id: "reviews", label: "reviews", href: "/admin/reviews", icon: "check" },
          {
            id: "resource-edits",
            label: "resourceEdits",
            rawLabel: "Resource edits",
            href: "/admin/resource-edits",
            icon: "layers"
          },
          { id: "verifications", label: "verifications", href: "/admin/verifications", icon: "shield" },
          {
            id: "resource-verifications",
            label: "resourceVerifications",
            rawLabel: "Resource verifications",
            href: "/admin/resource-verifications",
            icon: "shield"
          },
          { id: "complaints", label: "complaints", href: "/admin/complaints", icon: "flag" },
          { id: "policies", label: "policies", href: "/admin/policies", icon: "doc" }
        ]
      },
      {
        id: "inbox",
        label: "inbox",
        items: [
          { id: "contacts", label: "contactMessages", href: "/admin/contacts", icon: "inbox" }
        ]
      },
      {
        id: "operations",
        label: "operations",
        items: [
          { id: "users", label: "usersRoles", href: "/admin/users", icon: "user" },
          { id: "integrations", label: "integrations", href: "/admin/integrations", icon: "flow" },
          { id: "branding", label: "branding", href: "/admin/branding", icon: "eye" },
          { id: "settings", label: "settings", href: "/admin/settings", icon: "settings" }
        ]
      },
      {
        id: "site",
        label: "siteContent",
        items: [
          { id: "site-home", label: "siteOverview", href: "/admin/site", icon: "home-alt" },
          { id: "site-faq", label: "faq", href: "/admin/site/faq", icon: "doc" },
          { id: "site-how", label: "howItWorks", href: "/admin/site/how-it-works", icon: "flow" },
          { id: "site-criteria", label: "listingCriteria", href: "/admin/site/listing-criteria", icon: "check" },
          { id: "site-promo", label: "promoBanner", href: "/admin/site/promo", icon: "zap" }
        ]
      },
      {
        id: "ref-tables",
        label: "referenceTables",
        collapsible: true,
        defaultCollapsed: true,
        items: [
          { id: "ref-index", label: "allTables", href: "/admin/ref", icon: "database" },
          ...REF_TABLES.map((t) => ({
            id: `ref-${t.id}`,
            label: "",
            rawLabel: t.label,
            href: `/admin/ref/${t.id}`,
            icon: "database"
          }))
        ]
      }
    ]
  },
  provider: {
    role: "provider",
    label: "provider",
    basePath: "/provider",
    icon: "layers",
    groups: [
      {
        id: "overview",
        label: "overview",
        items: [
          { id: "dashboard", label: "dashboard", href: "/provider", icon: "home-alt" }
        ]
      },
      {
        id: "catalogue",
        label: "catalogue",
        items: [
          { id: "resources", label: "resources", href: "/provider/resources", icon: "layers" },
          { id: "submissions", label: "submissions", href: "/provider/submissions", icon: "inbox" },
          { id: "publish", label: "publishNew", href: "/provider/publish", icon: "plus" }
        ]
      },
      {
        id: "inbox",
        label: "inbox",
        items: [
          { id: "complaints", label: "complaints", href: "/provider/complaints", icon: "flag" },
          { id: "reviews", label: "reviews", href: "/provider/reviews", icon: "check" },
          { id: "incidents", label: "incidents", href: "/provider/incidents", icon: "shield" }
        ]
      },
      {
        id: "account",
        label: "account",
        items: [
          { id: "settings", label: "settings", href: "/provider/settings", icon: "settings" }
        ]
      }
    ]
  },
  verifier: {
    role: "verifier",
    label: "verifier",
    basePath: "/verifier",
    icon: "check",
    groups: [
      {
        id: "overview",
        label: "overview",
        items: [
          { id: "dashboard", label: "dashboard", href: "/verifier", icon: "home-alt" }
        ]
      },
      {
        id: "review",
        label: "review",
        items: [
          { id: "queue", label: "queue", href: "/verifier/queue", icon: "inbox" },
          { id: "decided", label: "decided", href: "/verifier/decided", icon: "check" }
        ]
      },
      {
        id: "evidence",
        label: "evidence",
        items: [
          { id: "runs", label: "evalRuns", href: "/verifier/runs", icon: "pulse" },
          { id: "benchmarks", label: "benchmarks", href: "/verifier/benchmarks", icon: "activity" },
          { id: "redteam", label: "redTeam", href: "/verifier/redteam", icon: "shield" }
        ]
      },
      {
        id: "outputs",
        label: "outputs",
        items: [
          { id: "reports", label: "reports", href: "/verifier/reports", icon: "doc" },
          { id: "settings", label: "settings", href: "/verifier/settings", icon: "settings" }
        ]
      }
    ]
  },
  sovereign: {
    role: "sovereign",
    label: "sovereign",
    basePath: "/sovereign",
    icon: "flag",
    groups: [
      {
        id: "overview",
        label: "overview",
        items: [
          { id: "dashboard", label: "dashboard", href: "/sovereign", icon: "home-alt" }
        ]
      },
      {
        id: "ecosystem",
        label: "ecosystem",
        items: [
          { id: "catalog", label: "nationalCatalogue", href: "/sovereign/catalog", icon: "layers" },
          { id: "topology", label: "topology", href: "/sovereign/topology", icon: "flow" },
          { id: "sectors", label: "sectors", href: "/sovereign/sectors", icon: "database" },
          { id: "partners", label: "partners", href: "/sovereign/partners", icon: "users" }
        ]
      },
      {
        id: "governance",
        label: "governance",
        items: [
          { id: "risk", label: "risk", href: "/sovereign/risk", icon: "shield" },
          { id: "policies", label: "policies", href: "/sovereign/policies", icon: "doc" },
          { id: "incidents", label: "incidents", href: "/sovereign/incidents", icon: "flag" }
        ]
      },
      {
        id: "outputs",
        label: "outputs",
        items: [
          { id: "reports", label: "reports", href: "/sovereign/reports", icon: "doc" },
          { id: "settings", label: "settings", href: "/sovereign/settings", icon: "settings" }
        ]
      }
    ]
  }
};
