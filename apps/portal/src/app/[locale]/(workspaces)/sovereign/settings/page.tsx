import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getConfig } from "@airegistry/sdk";
import { countReferenceTable } from "@airegistry/sdk/server";
import { loadSovereignSettingsView } from "@airegistry/sdk/server";

export const metadata = { title: "Sovereign · Settings" };
export const dynamic = "force-dynamic";

/**
 * Sovereign · Settings - read-only view of jurisdiction-specific deployment
 * configuration plus reference data scoped to this jurisdiction. Editing
 * jurisdiction defaults is an operator (admin) operation; this page surfaces
 * what IS in effect so the sovereign operator can audit the deployment
 * without bouncing into the admin portal.
 *
 * Module spec: `modules/sovereign/settings/product.md`.
 */
export default async function SovereignSettingsPage() {
  const i18n = await getTranslations("sovereign.settings");
  const cfg = getConfig();

  const [settingsView, sectorsActive, languagesActive] = await Promise.all([
    loadSovereignSettingsView(cfg.jurisdiction),
    countReferenceTable("sector"),
    countReferenceTable("language")
  ]);
  const jurisdiction = settingsView.jurisdiction;
  const providersHere = settingsView.providerCount;
  const listedHere = settingsView.listedResourceCount;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{i18n("title")}</h1>
        <p className="p-subtitle">{i18n("subtitle")}</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18
        }}
      >
        <Card title={i18n("jurisdictionCard")}>
          <Row label={i18n("labelCode")} mono>
            {cfg.jurisdiction}
          </Row>
          <Row label={i18n("labelDisplayName")}>{jurisdiction?.name ?? "-"}</Row>
          <Row label={i18n("labelType")}>{jurisdiction?.typeName ?? "-"}</Row>
          <Row label={i18n("labelIdentityDomain")} mono>
            {cfg.identityDomain}
          </Row>
        </Card>

        <Card title={i18n("coverageCard")}>
          <Row label={i18n("labelLocalProviders")} mono>
            {providersHere}
          </Row>
          <Row label={i18n("labelListedResources")} mono>
            {listedHere}
          </Row>
          <Row label={i18n("labelActiveSectors")} mono>
            {sectorsActive}
          </Row>
          <Row label={i18n("labelActiveLanguages")} mono>
            {languagesActive}
          </Row>
        </Card>

        <Card title={i18n("operatorCard")}>
          <Row label={i18n("labelOperator")}>{cfg.operatorName}</Row>
          <Row label={i18n("labelPortal")} mono>
            {cfg.portalDomain}
          </Row>
          <Row label={i18n("labelApiBase")} mono>
            {cfg.apiBaseUrl}
          </Row>
          <Row label={i18n("labelDefaultLanguage")} mono>
            {cfg.defaultLanguage}
          </Row>
          <Row label={i18n("labelSupportedLanguages")} mono>
            {cfg.supportedLanguages.join(", ")}
          </Row>
        </Card>

        <Card title={i18n("crossLinksCard")}>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
            <Link href="/sovereign/catalog" className="p-footer-link">
              {i18n("nationalCatalogue")}
            </Link>{" "}
            · {i18n("catalogueDesc", { jurisdiction: cfg.jurisdiction })}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>
            <Link href="/sovereign/incidents" className="p-footer-link">
              {i18n("nationalIncidents")}
            </Link>{" "}
            · {i18n("incidentsDesc")}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>
            <Link href="/sovereign/topology" className="p-footer-link">
              {i18n("topologyLink")}
            </Link>{" "}
            · {i18n("topologyDesc")}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>
            <Link href="/admin/settings" className="p-footer-link">
              {i18n("operatorSettings")}
            </Link>{" "}
            · {i18n("operatorSettingsDesc")}
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
