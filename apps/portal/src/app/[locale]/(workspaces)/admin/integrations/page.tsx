import { getTranslations } from "next-intl/server";
import { getConfig } from "@airegistry/sdk";

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
  const t = await getTranslations("admin.integrations");
  const cfg = getConfig();

  const smtpConfigured = Boolean(cfg.mail.smtpHost && cfg.mail.smtpPort);
  const oidcConfigured = Boolean(
    process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET
  );

  const statusLabels: Record<Integration["status"], string> = {
    configured: t("statusConfigured"),
    unconfigured: t("statusUnconfigured"),
    reserved: t("statusReserved")
  };

  const integrations: Integration[] = [
    {
      id: "smtp",
      label: t("smtpLabel"),
      status: smtpConfigured ? "configured" : "unconfigured",
      detail: smtpConfigured
        ? t("smtpDetailConfigured", {
            host: cfg.mail.smtpHost ?? "",
            port: String(cfg.mail.smtpPort ?? ""),
            from: cfg.mail.from ?? ""
          })
        : t("smtpDetailUnconfigured", { from: cfg.mail.from ?? "" }),
      spec: "ai-registry-specs/shared/email-notifications.md"
    },
    {
      id: "mcp",
      label: t("mcpLabel"),
      status: "configured",
      detail: t("mcpDetail"),
      endpoint: "POST /api/mcp",
      spec: "ai-registry/specs/001-ai-registry/contracts/mcp.md"
    },
    {
      id: "openapi",
      label: t("openapiLabel"),
      status: "configured",
      detail: t("openapiDetail"),
      endpoint: "GET /api/openapi"
    },
    {
      id: "well-known",
      label: t("capabilityLabel"),
      status: "configured",
      detail: t("capabilityDetail"),
      endpoint: "GET /.well-known/ai-registry"
    },
    {
      id: "health",
      label: t("healthLabel"),
      status: "configured",
      detail: t("healthDetail"),
      endpoint: "GET /api/health"
    },
    {
      id: "oidc",
      label: t("oidcLabel"),
      status: oidcConfigured ? "configured" : "reserved",
      detail: oidcConfigured
        ? t("oidcDetailConfigured", {
            issuer: process.env.OIDC_ISSUER ?? "(set OIDC_ISSUER)",
            clientId: process.env.OIDC_CLIENT_ID ?? ""
          })
        : t("oidcDetailUnconfigured"),
      spec: "ai-registry-specs/shared/auth.md"
    },
    {
      id: "federation",
      label: t("federationLabel"),
      status: "reserved",
      detail: t("federationDetail")
    },
    {
      id: "observability",
      label: t("observabilityLabel"),
      status: "reserved",
      detail: t("observabilityDetail")
    }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
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
              <Badge status={i.status} label={statusLabels[i.status]} />
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

function Badge({ status, label }: { status: "configured" | "unconfigured" | "reserved"; label: string }) {
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
      {label}
    </span>
  );
}
