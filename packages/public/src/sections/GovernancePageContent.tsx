import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getBranding } from "@airegistry/core/branding";
import { Reveal } from "../shell/Reveal";
import { PageHero } from "@airegistry/ui-kit";

const sectionStyle: React.CSSProperties = {
  paddingTop: 32,
  paddingBottom: 32,
  scrollMarginTop: 96
};
const panelStyle: React.CSSProperties = {
  padding: 28,
  fontSize: 15,
  lineHeight: 1.7
};
const headingStyle: React.CSSProperties = { marginBottom: 12 };

export async function GovernancePageContent() {
  const [{ operatorName, portalDomain }, t] = await Promise.all([
    getBranding(),
    getTranslations("governancePage")
  ]);
  return (
    <div>
      <PageHero
        crumb={t("crumb")}
        title={
          <>
            {t.rich("pageTitle", {
              accent: (chunks) => <span className="gradient-text">{chunks}</span>
            })}
          </>
        }
        subtitle={t("pageSubtitle")}
      />

      <section className="section" id="charter" style={sectionStyle}>
        <h2 style={headingStyle}>{t("charterTitle")}</h2>
        <div className="gov-grid" style={{ gap: 32 }}>
          <Reveal>
            <div className="glass" style={{ padding: 28 }}>
              <h3>{t("whatItIs")}</h3>
              <ul
                style={{
                  marginTop: 14,
                  paddingLeft: 18,
                  color: "var(--text-2)",
                  fontSize: 14,
                  lineHeight: 1.65
                }}
              >
                <li>{t("whatItIsItem1")}</li>
                <li>
                  {t.rich("whatItIsItem2", {
                    mono: (chunks) => <span className="mono" style={{ color: "var(--text)" }}>{chunks}</span>
                  })}
                </li>
                <li>{t("whatItIsItem3")}</li>
                <li>{t("whatItIsItem4")}</li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="glass" style={{ padding: 28 }}>
              <h3>{t("whatItIsNot")}</h3>
              <ul
                style={{
                  marginTop: 14,
                  paddingLeft: 18,
                  color: "var(--text-2)",
                  fontSize: 14,
                  lineHeight: 1.65
                }}
              >
                <li>{t("whatItIsNotItem1")}</li>
                <li>{t("whatItIsNotItem2")}</li>
                <li>{t("whatItIsNotItem3")}</li>
                <li>{t("whatItIsNotItem4")}</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="review-board" style={sectionStyle}>
        <h2 style={headingStyle}>{t("reviewBoardTitle")}</h2>
        <div className="glass" style={panelStyle}>
          <p>
            {t.rich("reviewBoardBody1", {
              link: (chunks) => (
                <Link href="/sovereignty-rubric" style={{ color: "var(--text-2)" }}>
                  {chunks}
                </Link>
              )
            })}
          </p>
          <p style={{ marginTop: 14 }}>
            {t.rich("reviewBoardBody2", {
              link: (chunks) => (
                <a href="#disclosure" style={{ color: "var(--text-2)" }}>
                  {chunks}
                </a>
              )
            })}
          </p>
        </div>
      </section>

      <section className="section" id="appeals" style={sectionStyle}>
        <h2 style={headingStyle}>{t("appealsTitle")}</h2>
        <div className="glass" style={panelStyle}>
          <p>{t("appealsIntro")}</p>
          <ol style={{ paddingLeft: 22, marginTop: 12, display: "grid", gap: 8 }}>
            <li>
              {t.rich("appealsStep1", {
                link: (chunks) => (
                  <Link href="/contact" style={{ color: "var(--text-2)" }}>
                    {chunks}
                  </Link>
                )
              })}
            </li>
            <li>{t("appealsStep2")}</li>
            <li>{t("appealsStep3")}</li>
          </ol>
          <p style={{ marginTop: 14 }}>
            {t.rich("appealsNote", {
              link: (chunks) => (
                <Link href="/sovereignty-rubric" style={{ color: "var(--text-2)" }}>
                  {chunks}
                </Link>
              )
            })}
          </p>
        </div>
      </section>

      <section className="section" id="disclosure" style={sectionStyle}>
        <h2 style={headingStyle}>{t("disclosureTitle")}</h2>
        <div className="glass" style={panelStyle}>
          <p>{t("disclosureIntro", { operatorName, portalDomain })}</p>
          <ul style={{ paddingLeft: 22, marginTop: 12, display: "grid", gap: 8 }}>
            <li>{t("disclosureItem1")}</li>
            <li>{t("disclosureItem2")}</li>
            <li>{t("disclosureItem3")}</li>
            <li>{t("disclosureItem4")}</li>
          </ul>
          <p style={{ marginTop: 14 }}>
            {t.rich("disclosureNote", {
              link: (chunks) => (
                <Link href="/audit-log" style={{ color: "var(--text-2)" }}>
                  {chunks}
                </Link>
              )
            })}
          </p>
        </div>
      </section>

      <section className="section" id="public-log" style={sectionStyle}>
        <h2 style={headingStyle}>{t("publicLogTitle")}</h2>
        <div className="glass" style={panelStyle}>
          <p>
            {t.rich("publicLogBody", {
              link: (chunks) => (
                <Link href="/audit-log" style={{ color: "var(--text-2)" }}>
                  {chunks}
                </Link>
              )
            })}
          </p>
        </div>
      </section>
    </div>
  );
}
