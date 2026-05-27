import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@airegistry/ui-kit";
import { Reveal } from "../shell/Reveal";

const PILLARS: { icon: IconName; titleKey: string; descKey: string }[] = [
  { icon: "shield", titleKey: "providerVerification", descKey: "providerVerificationDesc" },
  { icon: "flag", titleKey: "sovereigntyReview", descKey: "sovereigntyReviewDesc" },
  { icon: "lock", titleKey: "runtimeIdentity", descKey: "runtimeIdentityDesc" },
  { icon: "doc", titleKey: "openAuditLog", descKey: "openAuditLogDesc" }
];

const TEST_ROWS: { labelKey: string; bodyKey: string }[] = [
  { labelKey: "localLaw", bodyKey: "localLawDesc" },
  { labelKey: "localData", bodyKey: "localDataDesc" },
  { labelKey: "localSystems", bodyKey: "localSystemsDesc" },
  { labelKey: "languageCulture", bodyKey: "languageCultureDesc" }
];

export async function GovernanceSection() {
  const t = await getTranslations("governance");
  return (
    <section className="section">
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>{t("eyebrow")}</span>
        </div>
        <h2>
          {t("heading")}
          <br />
          <span className="gradient-text">{t("headingAccent")}</span>
        </h2>
        <p>{t("description")}</p>
      </Reveal>

      <div className="gov-grid">
        <Reveal>
          <div className="gov-pillars">
            {PILLARS.map((pillar) => (
              <div className="pillar feature-card" key={pillar.titleKey}>
                <div className="pillar-icon">
                  <Icon name={pillar.icon} size={16} />
                </div>
                <div className="pillar-title">{t(pillar.titleKey as any)}</div>
                <div className="pillar-desc">{t(pillar.descKey as any)}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="trust-chain-panel">
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 11,
                color: "var(--text-3)",
                letterSpacing: "0.14em",
                textTransform: "uppercase"
              }}
            >
              {t("sovereigntyTest")}
            </div>
            <h3 style={{ marginTop: 12 }}>{t("specificNotAspirational")}</h3>
            <p style={{ marginTop: 10, fontSize: 14 }}>
              {t("sovereigntyTestDesc")}
            </p>

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              {TEST_ROWS.map((row) => (
                <div
                  key={row.labelKey}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    padding: "10px 0",
                    borderBottom: "1px dashed var(--border)"
                  }}
                >
                  <span
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 11,
                      color: "var(--secondary)",
                      minWidth: 140,
                      paddingTop: 1,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase"
                    }}
                  >
                    {t(row.labelKey as any)}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-2)", flex: 1 }}>{t(row.bodyKey as any)}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "auto",
                paddingTop: 18,
                fontSize: 12,
                fontFamily: "IBM Plex Mono, monospace",
                color: "var(--text-3)"
              }}
            >
              {t("qualityNote")}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
