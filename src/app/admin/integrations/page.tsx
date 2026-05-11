import { getConfig } from "@/lib/config";

export const metadata = { title: "Admin · Integrations" };
export const dynamic = "force-dynamic";

type Integration = {
  id: string;
  label: string;
  status: "configured" | "unconfigured" | "reserved";
  detail: string;
  endpoint?: string;
  spec?: string;
};

/**
 * Admin · Integrations - read-only view of every external integration the
 * deployment carries: SMTP, MCP adapter, OIDC slot, federation, observability.
 *
 * Each row reflects boot-time configuration sourced from `src/lib/config.ts`
 * + env. There is no admin-toggle for these - wiring them up is a deploy
 * operation. Module spec: `modules/admin/integrations/product.md`.
 */
export default async function AdminIntegrationsPage() {
  const cfg = getConfig();

  const smtpConfigured = Boolean(cfg.mail.smtpHost && cfg.mail.smtpPort);
  const oidcConfigured = Boolean(
    process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET
  );

  const integrations: Integration[] = [
    {
      id: "smtp",
      label: "Outbound mail (SMTP)",
      status: smtpConfigured ? "configured" : "unconfigured",
      detail: smtpConfigured
        ? `Host ${cfg.mail.smtpHost}:${cfg.mail.smtpPort}, from ${cfg.mail.from}`
        : `No SMTP host set - verification, password reset, and contact replies log to console (dev mode). From: ${cfg.mail.from}`,
      spec: "ai-registry-specs/shared/email-notifications.md"
    },
    {
      id: "mcp",
      label: "MCP Streamable HTTP",
      status: "configured",
      detail:
        "Tools: registry.list / registry.get / registry.resolve / registry.discover / registry.well_known. Streamable HTTP is implemented via JSON-RPC 2.0 over POST.",
      endpoint: "POST /api/mcp",
      spec: "ai-registry/specs/001-ai-registry/contracts/mcp.md"
    },
    {
      id: "openapi",
      label: "OpenAPI 3.0 document",
      status: "configured",
      detail:
        "Self-describing surface for the public REST + authenticated subsets. Mirrors module-level api.yaml files.",
      endpoint: "GET /api/openapi"
    },
    {
      id: "well-known",
      label: "Capability document",
      status: "configured",
      detail:
        "Identity domain, supported types/languages, endpoint templates. Auto-discovered by foreign integrators.",
      endpoint: "GET /.well-known/ai-registry"
    },
    {
      id: "health",
      label: "Health probe",
      status: "configured",
      detail: "DB-readiness probe used by load balancers + the smoke runner.",
      endpoint: "GET /api/health"
    },
    {
      id: "oidc",
      label: "OIDC sign-in",
      status: oidcConfigured ? "configured" : "reserved",
      detail: oidcConfigured
        ? `Issuer ${process.env.OIDC_ISSUER ?? "(set OIDC_ISSUER)"}, client ${process.env.OIDC_CLIENT_ID}.`
        : "Reserved as a config-driven extension. The schema's Account table is ready; wiring lands when OIDC_* env vars are populated.",
      spec: "ai-registry-specs/shared/auth.md"
    },
    {
      id: "federation",
      label: "Federation peers",
      status: "reserved",
      detail:
        "Cross-registry mirror is schema-only in MVP - Resource.sourceRegistryId / sourceAirId are populated via worker once federation lands (post-Phase 5)."
    },
    {
      id: "observability",
      label: "Observability sink",
      status: "reserved",
      detail:
        "Audit log + email-attempt logs are stdout-only in v0.4. Wiring to a hosted sink (e.g. OpenTelemetry, Loki) is operator-driven post-Phase 5."
    }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Integrations</h1>
        <p className="p-subtitle">
          Outbound and inbound integrations carried by this deployment. Toggling values is a
          deploy-time operation (env + restart); this surface is read-only.
        </p>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {integrations.map((i) => (
          <section
            key={i.id}
            className="glass"
            style={{ padding: 18, borderRadius: 12, display: "grid", gap: 8 }}
          >
            <header style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <h2 style={{ fontSize: 15, margin: 0, fontWeight: 500 }}>{i.label}</h2>
              <Badge status={i.status} />
            </header>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5 }}>
              {i.detail}
            </p>
            {(i.endpoint || i.spec) && (
              <p
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  color: "var(--text-3)",
                  fontFamily: "IBM Plex Mono, monospace"
                }}
              >
                {i.endpoint ? <span>{i.endpoint}</span> : null}
                {i.endpoint && i.spec ? " · " : null}
                {i.spec ? <span>{i.spec}</span> : null}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function Badge({ status }: { status: "configured" | "unconfigured" | "reserved" }) {
  const colour =
    status === "configured" ? "#10b981" : status === "unconfigured" ? "#f59e0b" : "var(--text-3)";
  return (
    <span
      style={{
        fontSize: 10.5,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontFamily: "IBM Plex Mono, monospace",
        color: colour,
        border: `1px solid ${colour}`,
        borderRadius: 999,
        padding: "2px 10px",
        whiteSpace: "nowrap"
      }}
    >
      {status}
    </span>
  );
}
