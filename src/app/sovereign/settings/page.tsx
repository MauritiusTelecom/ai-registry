import Link from "next/link";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Sovereign · Settings" };
export const dynamic = "force-dynamic";

/**
 * Sovereign · Settings — read-only view of jurisdiction-specific deployment
 * configuration plus reference data scoped to this jurisdiction. Editing
 * jurisdiction defaults is an operator (admin) operation; this page surfaces
 * what IS in effect so the sovereign operator can audit the deployment
 * without bouncing into the admin portal.
 *
 * Module spec: `modules/sovereign/settings/product.md`.
 */
export default async function SovereignSettingsPage() {
  const cfg = getConfig();

  const [jurisdiction, providersHere, listedHere, sectorsActive, languagesActive] =
    await Promise.all([
      prisma.jurisdiction.findUnique({
        where: { code: cfg.jurisdiction },
        include: { type: { select: { code: true, name: true } } }
      }),
      prisma.provider.count({
        where: { homeJurisdiction: { code: cfg.jurisdiction } }
      }),
      prisma.resource.count({
        where: {
          primaryJurisdiction: { code: cfg.jurisdiction },
          lifecycleStatus: { code: "listed" }
        }
      }),
      prisma.sector.count({ where: { active: true } }),
      prisma.language.count({ where: { active: true } })
    ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Sovereign settings</h1>
        <p className="p-subtitle">
          Read-only view of the deployment configuration scoped to{" "}
          <strong>{cfg.jurisdiction}</strong>. Jurisdiction defaults are admin-managed; this page
          shows what is currently in effect.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18
        }}
      >
        <Card title="Jurisdiction">
          <Row label="Code" mono>
            {cfg.jurisdiction}
          </Row>
          <Row label="Display name">{jurisdiction?.name ?? "—"}</Row>
          <Row label="Type">{jurisdiction?.type.name ?? "—"}</Row>
          <Row label="Identity domain" mono>
            {cfg.identityDomain}
          </Row>
        </Card>

        <Card title="Coverage">
          <Row label="Local providers" mono>
            {providersHere}
          </Row>
          <Row label="Listed resources" mono>
            {listedHere}
          </Row>
          <Row label="Active sectors" mono>
            {sectorsActive}
          </Row>
          <Row label="Active languages" mono>
            {languagesActive}
          </Row>
        </Card>

        <Card title="Operator">
          <Row label="Operator">{cfg.operatorName}</Row>
          <Row label="Portal" mono>
            {cfg.portalDomain}
          </Row>
          <Row label="API base" mono>
            {cfg.apiBaseUrl}
          </Row>
          <Row label="Default language" mono>
            {cfg.defaultLanguage}
          </Row>
          <Row label="Supported languages" mono>
            {cfg.supportedLanguages.join(", ")}
          </Row>
        </Card>

        <Card title="Cross-links">
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
            <Link href="/sovereign/catalog" className="p-footer-link">
              National catalogue
            </Link>{" "}
            · public-listed resources in {cfg.jurisdiction}.
          </p>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>
            <Link href="/sovereign/incidents" className="p-footer-link">
              National incidents
            </Link>{" "}
            · enforcement actions taken locally.
          </p>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>
            <Link href="/sovereign/topology" className="p-footer-link">
              Topology
            </Link>{" "}
            · provider → resource graph.
          </p>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>
            <Link href="/admin/settings" className="p-footer-link">
              Operator settings
            </Link>{" "}
            · admin-only, deployment-wide.
          </p>
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "150px 1fr",
        gap: 12,
        alignItems: "baseline"
      }}
    >
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
