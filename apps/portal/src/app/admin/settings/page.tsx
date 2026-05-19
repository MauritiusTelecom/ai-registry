import Link from "next/link";
import { getConfig } from "@airegistry/sdk";
import { prisma } from "@/lib/prisma";
import { countReferenceTable } from "@airegistry/sdk/server";

export const metadata = { title: "Admin · Settings" };
export const dynamic = "force-dynamic";

/**
 * Admin · Settings - read-only mirror of the deployment configuration plus a
 * jump-off to the editable surfaces. Every value below flows through
 * `src/lib/config.ts` and `.env`; changing them requires a redeploy. The
 * controlled-vocabulary CRUD lives at `/admin/ref/[table]`.
 *
 * Module spec: `ai-registry-specs/modules/admin/settings/product.md`.
 */
export default async function AdminSettingsPage() {
  const cfg = getConfig();

  const [resourceTypes, languages, sectors, providers, lifecycle] = await Promise.all([
    countReferenceTable("resourceType"),
    countReferenceTable("language"),
    countReferenceTable("sector"),
    prisma.provider.count(),
    countReferenceTable("lifecycleStatus")
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Settings</h1>
        <p className="p-subtitle">
          Deployment configuration. These values are sourced from{" "}
          <code>src/lib/config.ts</code> at boot - change them in <code>.env</code> then redeploy.
          Reference taxonomies are editable through the{" "}
          <Link href="/admin/ref" className="p-footer-link">
            Reference Tables
          </Link>{" "}
          surface.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18
        }}
      >
        <Card title="Identity">
          <Row label="Registry name">{cfg.registryName}</Row>
          <Row label="Operator">{cfg.operatorName}</Row>
          <Row label="Identity domain" mono>
            {cfg.identityDomain}
          </Row>
          <Row label="Portal domain" mono>
            {cfg.portalDomain}
          </Row>
          <Row label="API base" mono>
            {cfg.apiBaseUrl}
          </Row>
          <Row label="Jurisdiction" mono>
            {cfg.jurisdiction}
          </Row>
        </Card>

        <Card title="Languages and types">
          <Row label="Default language" mono>
            {cfg.defaultLanguage}
          </Row>
          <Row label="Supported languages" mono>
            {cfg.supportedLanguages.join(", ")}
          </Row>
          <Row label="Resource types" mono>
            {cfg.resourceTypes.join(", ")}
          </Row>
        </Card>

        <Card title="Outbound mail">
          <Row label="From">{cfg.mail.from}</Row>
          <Row label="SMTP host" mono>
            {cfg.mail.smtpHost ?? "- (console fallback)"}
          </Row>
          <Row label="SMTP port" mono>
            {cfg.mail.smtpPort ?? "-"}
          </Row>
          <Row label="SMTP auth" mono>
            {cfg.mail.smtpUser ? "configured" : "anonymous / unset"}
          </Row>
        </Card>

        <Card title="Reference data">
          <Row label="Active resource types" mono>
            {resourceTypes}
          </Row>
          <Row label="Active languages" mono>
            {languages}
          </Row>
          <Row label="Active sectors" mono>
            {sectors}
          </Row>
          <Row label="Lifecycle states" mono>
            {lifecycle}
          </Row>
          <Row label="Total providers" mono>
            {providers}
          </Row>
          <div style={{ marginTop: 10 }}>
            <Link href="/admin/ref" className="p-footer-link">
              Manage reference tables →
            </Link>
          </div>
        </Card>

        <Card title="Auth + sessions">
          <Row label="Cookie name" mono>
            {cfg.auth.sessionCookieName}
          </Row>
          <Row label="Session TTL" mono>
            {cfg.auth.sessionTtlSeconds}s
          </Row>
          <Row label="Auth secret" mono>
            {cfg.auth.secret ? "configured" : "missing"}
          </Row>
        </Card>

        <Card title="Operations">
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
            Health probe: <code>GET /api/health</code>
            <br />
            OpenAPI: <code>GET /api/openapi</code>
            <br />
            MCP adapter: <code>POST /api/mcp</code>
            <br />
            Well-known: <code>GET /.well-known/ai-registry</code>
          </p>
          <div style={{ marginTop: 12 }}>
            <Link href="/admin/audit" className="p-footer-link">
              Audit log →
            </Link>
            {" · "}
            <Link href="/admin/integrations" className="p-footer-link">
              Integrations →
            </Link>
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
