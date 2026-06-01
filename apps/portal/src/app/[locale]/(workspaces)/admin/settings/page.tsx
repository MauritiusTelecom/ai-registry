import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getConfig } from "@airegistry/sdk";
import { countReferenceTable } from "@airegistry/sdk/server";
import { loadAdminSettingsProviderCount } from "@airegistry/sdk/server";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("admin.settings");
}

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const t = await getTranslations("adminSettings");
  const cfg = getConfig();

  const [resourceTypes, languages, sectors, providers, lifecycle] = await Promise.all([
    countReferenceTable("resourceType"),
    countReferenceTable("language"),
    countReferenceTable("sector"),
    loadAdminSettingsProviderCount(),
    countReferenceTable("lifecycleStatus")
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">
          {t.rich("subtitle", {
            code: (chunks) => <code>{chunks}</code>,
            refLink: (chunks) => (
              <Link href="/admin/ref" className="p-footer-link">{chunks}</Link>
            )
          })}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18
        }}
      >
        <Card title={t("identity")}>
          <Row label={t("registryName")}>{cfg.registryName}</Row>
          <Row label={t("operator")}>{cfg.operatorName}</Row>
          <Row label={t("identityDomain")} mono>{cfg.identityDomain}</Row>
          <Row label={t("portalDomain")} mono>{cfg.portalDomain}</Row>
          <Row label={t("apiBase")} mono>{cfg.apiBaseUrl}</Row>
          <Row label={t("jurisdiction")} mono>{cfg.jurisdiction}</Row>
        </Card>

        <Card title={t("languagesAndTypes")}>
          <Row label={t("defaultLanguage")} mono>{cfg.defaultLanguage}</Row>
          <Row label={t("supportedLanguages")} mono>{cfg.supportedLanguages.join(", ")}</Row>
          <Row label={t("resourceTypes")} mono>{cfg.resourceTypes.join(", ")}</Row>
        </Card>

        <Card title={t("outboundMail")}>
          <Row label={t("from")}>{cfg.mail.from}</Row>
          <Row label={t("smtpHost")} mono>{cfg.mail.smtpHost ?? t("consoleFallback")}</Row>
          <Row label={t("smtpPort")} mono>{cfg.mail.smtpPort ?? "-"}</Row>
          <Row label={t("smtpAuth")} mono>{cfg.mail.smtpUser ? t("configured") : t("anonymousUnset")}</Row>
        </Card>

        <Card title={t("referenceData")}>
          <Row label={t("activeResourceTypes")} mono>{resourceTypes}</Row>
          <Row label={t("activeLanguages")} mono>{languages}</Row>
          <Row label={t("activeSectors")} mono>{sectors}</Row>
          <Row label={t("lifecycleStates")} mono>{lifecycle}</Row>
          <Row label={t("totalProviders")} mono>{providers}</Row>
          <div style={{ marginTop: 10 }}>
            <Link href="/admin/ref" className="p-footer-link">
              {t("manageRefTables")}
            </Link>
          </div>
        </Card>

        <Card title={t("authSessions")}>
          <Row label={t("cookieName")} mono>{cfg.auth.sessionCookieName}</Row>
          <Row label={t("sessionTtl")} mono>{cfg.auth.sessionTtlSeconds}s</Row>
          <Row label={t("authSecret")} mono>{cfg.auth.secret ? t("configured") : t("missing")}</Row>
        </Card>

        <Card title={t("operations")}>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
            {t("healthProbe")} <code>GET /api/health</code><br />
            {t("openApi")} <code>GET /api/openapi</code><br />
            {t("mcpAdapter")} <code>POST /api/mcp</code><br />
            {t("wellKnown")} <code>GET /.well-known/ai-registry</code>
          </p>
          <div style={{ marginTop: 12 }}>
            <Link href="/admin/audit" className="p-footer-link">{t("auditLog")}</Link>
            {" · "}
            <Link href="/admin/integrations" className="p-footer-link">{t("integrations")}</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass" style={{ padding: 20, borderRadius: 12 }}>
      <h2
        style={{
          fontSize: 12,
          fontFamily: "IBM Plex Mono, monospace",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          marginBottom: 12
        }}
      >
        {title}
      </h2>
      <dl style={{ display: "grid", gap: 8, fontSize: 13, margin: 0 }}>{children}</dl>
    </section>
  );
}

function Row({
  label,
  children,
  mono = false
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 12, alignItems: "baseline" }}>
      <dt style={{ color: "var(--text-3)" }}>{label}</dt>
      <dd
        style={{
          margin: 0,
          color: "var(--text)",
          fontFamily: mono ? "IBM Plex Mono, monospace" : undefined,
          fontSize: mono ? 12.5 : undefined,
          wordBreak: "break-all"
        }}
      >
        {children}
      </dd>
    </div>
  );
}
