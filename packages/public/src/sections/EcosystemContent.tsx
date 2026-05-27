"use client";

import { Link } from "@/i18n/navigation";
import { Icon, type IconName } from "@airegistry/ui-kit";
import { useTranslations } from "next-intl";
import { Reveal } from "../shell/Reveal";
import { PageHero } from "@airegistry/ui-kit";
import { usePublicBranding } from "../lib/branding-context";

// ============================================================
// Section content - sourced from AI_Registry_Decision_Makers_Guide.html
// ============================================================

type TranslationFn = ReturnType<typeof useTranslations>;

function getLayers(t: TranslationFn) {
  return [
    { num: "01", label: t("layer1Label"), title: t("layer1Title"), desc: t("layer1Desc"), meta: t("layer1Meta") },
    { num: "02", label: t("layer2Label"), title: t("layer2Title"), desc: t("layer2Desc"), meta: t("layer2Meta") },
    { num: "03", label: t("layer3Label"), title: t("layer3Title"), desc: t("layer3Desc"), meta: t("layer3Meta") }
  ];
}

function getOperatorProfiles(t: TranslationFn) {
  return [
    t("operatorProfile1"),
    t("operatorProfile2"),
    t("operatorProfile3"),
    t("operatorProfile4"),
    t("operatorProfile5"),
    t("operatorProfile6"),
    t("operatorProfile7")
  ];
}

function getIntegratorRoles(t: TranslationFn): { icon: IconName; title: string; desc: string; tone: "primary" | "tertiary" | "secondary" | "emerald" }[] {
  return [
    { icon: "flow", title: t("integratorRole1Title"), desc: t("integratorRole1Desc"), tone: "primary" },
    { icon: "edit", title: t("integratorRole2Title"), desc: t("integratorRole2Desc"), tone: "tertiary" },
    { icon: "layers", title: t("integratorRole3Title"), desc: t("integratorRole3Desc"), tone: "secondary" },
    { icon: "users", title: t("integratorRole4Title"), desc: t("integratorRole4Desc"), tone: "emerald" }
  ];
}

function getAudiences(t: TranslationFn): { icon: IconName; title: string; sub: string; points: string[] }[] {
  return [
    { icon: "flag", title: t("audience1Title"), sub: t("audience1Sub"), points: [t("audience1Point1"), t("audience1Point2"), t("audience1Point3")] },
    { icon: "shield", title: t("audience2Title"), sub: t("audience2Sub"), points: [t("audience2Point1"), t("audience2Point2"), t("audience2Point3")] },
    { icon: "cpu", title: t("audience3Title"), sub: t("audience3Sub"), points: [t("audience3Point1"), t("audience3Point2"), t("audience3Point3")] },
    { icon: "users", title: t("audience4Title"), sub: t("audience4Sub"), points: [t("audience4Point1"), t("audience4Point2"), t("audience4Point3")] }
  ];
}

function getFederationPrinciples(t: TranslationFn) {
  return [
    { label: t("federationPrinciple1Label"), title: t("federationPrinciple1Title"), desc: t("federationPrinciple1Desc") },
    { label: t("federationPrinciple2Label"), title: t("federationPrinciple2Title"), desc: t("federationPrinciple2Desc") },
    { label: t("federationPrinciple3Label"), title: t("federationPrinciple3Title"), desc: t("federationPrinciple3Desc") },
    { label: t("federationPrinciple4Label"), title: t("federationPrinciple4Title"), desc: t("federationPrinciple4Desc") }
  ];
}

function getTracks(t: TranslationFn): { num: string; title: string; desc: string; cta?: string; href?: string; featured: boolean }[] {
  return [
    { num: t("track1Label"), title: t("track1Title"), desc: t("track1Desc"), cta: t("track1Cta"), href: "https://github.com/MauritiusTelecom/ai-registry", featured: true },
    { num: t("track2Label"), title: t("track2Title"), desc: t("track2Desc"), cta: t("track2Cta"), href: "https://github.com/MauritiusTelecom/ai-registry/pulls", featured: false },
    { num: t("track3Label"), title: t("track3Title"), desc: t("track3Desc"), cta: t("track3Cta"), href: "/contact", featured: false },
    { num: t("track4Label"), title: t("track4Title"), desc: t("track4Desc"), featured: false }
  ];
}

function getNavItems(t: TranslationFn) {
  return [
    { id: "platform", label: t("navPlatform") },
    { id: "operators", label: t("navOperators") },
    { id: "integrators", label: t("navIntegrators") },
    { id: "audiences", label: t("navAudiences") },
    { id: "federation", label: t("navFederation") },
    { id: "engage", label: t("navEngage") }
  ];
}

// ============================================================
// Sub-sections
// ============================================================

function AnchorNav() {
  const t = useTranslations("ecosystem");
  const navItems = getNavItems(t);
  return (
    <div
      style={{
        position: "sticky",
        top: 64,
        zIndex: 5,
        padding: "12px 0",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        background:
          "linear-gradient(180deg, rgba(var(--bg-rgb, 10,10,12), 0.85) 0%, rgba(var(--bg-rgb, 10,10,12), 0.65) 100%)",
        borderBottom: "1px solid var(--hairline)"
      }}
    >
      <div className="page" style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            justifyContent: "center",
            padding: "6px 8px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "rgba(var(--primary-rgb), 0.04)"
          }}
        >
          {navItems.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              style={{
                fontSize: 12.5,
                padding: "6px 12px",
                borderRadius: 999,
                color: "var(--text-2)",
                textDecoration: "none",
                fontWeight: 500,
                letterSpacing: "0.01em",
                transition: "color 160ms, background 160ms"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.background = "rgba(var(--primary-rgb), 0.10)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-2)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              {n.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThePlatform() {
  const t = useTranslations("ecosystem");
  const layers = getLayers(t);
  return (
    <section className="section" id="platform" style={{ scrollMarginTop: 120 }}>
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>{t("platformEyebrow")}</span>
        </div>
        <h2>
          {t("platformHeading")}{" "}
          <span className="gradient-text">{t("platformHeadingAccent")}</span>
        </h2>
        <p>{t("platformDescription")}</p>
      </Reveal>

      <Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16
          }}
        >
          {layers.map((layer) => (
            <div
              key={layer.num}
              className="feature-card"
              style={{
                position: "relative",
                padding: 22,
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--panel)"
              }}
            >
              <div
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  background: "var(--grad-text)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  marginBottom: 8
                }}
              >
                {layer.num}
              </div>
              <div
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-2)",
                  marginBottom: 10
                }}
              >
                {layer.label}
              </div>
              <h4
                style={{
                  fontSize: 17,
                  fontWeight: 500,
                  margin: "0 0 8px",
                  letterSpacing: "-0.01em"
                }}
              >
                {layer.title}
              </h4>
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--text-2)",
                  lineHeight: 1.55,
                  margin: "0 0 14px"
                }}
              >
                {layer.desc}
              </p>
              <div
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 12,
                  color: "var(--text-2)",
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "rgba(var(--primary-rgb), 0.06)",
                  border: "1px solid var(--border)"
                }}
              >
                {layer.meta}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div
          style={{
            marginTop: 24,
            padding: "16px 22px",
            borderRadius: 12,
            border: "1px solid var(--border-strong)",
            background:
              "linear-gradient(90deg, rgba(var(--primary-rgb),0.08), rgba(var(--tertiary-rgb),0.08))",
            textAlign: "center",
            color: "var(--text-2)",
            fontSize: 14
          }}
        >
          <strong style={{ color: "var(--text)" }}>{t("registryPoints")}</strong>{" "}
          &nbsp;{t("providerOperates")}&nbsp; {t("hostingSecures")}
        </div>
      </Reveal>
    </section>
  );
}

function WhoRunsIt() {
  const t = useTranslations("ecosystem");
  const { operatorName, portalDomain } = usePublicBranding();
  const portalUrl = `https://${portalDomain}`;
  const operatorProfiles = getOperatorProfiles(t);
  return (
    <section className="section" id="operators" style={{ scrollMarginTop: 120 }}>
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>{t("operatorsEyebrow")}</span>
        </div>
        <h2>
          {t("operatorsHeading")} <span className="gradient-text">{t("operatorsHeadingAccent")}</span>
        </h2>
        <p>
          {t.rich("operatorsDescription", {
            operatorName,
            portalDomain,
            strong: (chunks) => <strong style={{ color: "var(--text)" }}>{chunks}</strong>,
            link: (chunks) => (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--primary)", textDecoration: "none" }}
              >
                {chunks}
              </a>
            )
          })}
        </p>
      </Reveal>

      <Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16
          }}
        >
          <div
            className="feature-card"
            style={{
              padding: 24,
              borderRadius: 14,
              border: "1px solid var(--border-strong)",
              background:
                "radial-gradient(300px 200px at 0% 0%, rgba(var(--secondary-rgb),0.10), transparent 60%), var(--panel)"
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "rgba(var(--secondary-rgb), 0.12)",
                color: "var(--secondary)",
                border: "1px solid rgba(var(--secondary-rgb), 0.30)",
                marginBottom: 12
              }}
            >
              <Icon name="check" size={18} stroke={1.8} />
            </div>
            <h4 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 500 }}>
              {t("dpiEnablerTitle")}
            </h4>
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                color: "var(--text-2)",
                fontSize: 14,
                lineHeight: 1.6,
                display: "grid",
                gap: 8
              }}
            >
              <li>{t("dpiEnablerPoint1")}</li>
              <li>{t("dpiEnablerPoint2")}</li>
              <li>{t("dpiEnablerPoint3")}</li>
              <li>{t("dpiEnablerPoint4")}</li>
            </ul>
          </div>

          <div
            className="feature-card"
            style={{
              padding: 24,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--panel)"
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.30)",
                marginBottom: 12
              }}
            >
              <Icon name="users" size={18} stroke={1.8} />
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 500 }}>
              {t("operatorProfilesTitle")}
            </h4>
            <p style={{ color: "var(--text-2)", fontSize: 13.5, margin: "0 0 14px" }}>
              {t("operatorProfilesDesc")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {operatorProfiles.map((p) => (
                <span
                  key={p}
                  style={{
                    fontSize: 12.5,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "rgba(var(--primary-rgb), 0.08)",
                    border: "1px solid var(--border)",
                    color: "var(--text)"
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16
          }}
        >
          <div
            className="feature-card"
            style={{
              padding: 22,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--panel)"
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "rgba(var(--primary-rgb), 0.12)",
                color: "var(--primary)",
                border: "1px solid rgba(var(--primary-rgb), 0.30)",
                marginBottom: 12
              }}
            >
              <Icon name="layers" size={18} stroke={1.8} />
            </div>
            <h5 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500 }}>
              {t("telcosTitle")}
            </h5>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13.5, lineHeight: 1.55 }}>
              {t("telcosDesc")}
            </p>
          </div>

          <div
            className="feature-card"
            style={{
              padding: 22,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--panel)"
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "rgba(var(--tertiary-rgb), 0.12)",
                color: "var(--tertiary)",
                border: "1px solid rgba(var(--tertiary-rgb), 0.30)",
                marginBottom: 12
              }}
            >
              <Icon name="shield" size={18} stroke={1.8} />
            </div>
            <h5 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500 }}>
              {t("governmentTitle")}
            </h5>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13.5, lineHeight: 1.55 }}>
              {t("governmentDesc")}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Integrators() {
  const t = useTranslations("ecosystem");
  const integratorRoles = getIntegratorRoles(t);
  const tones: Record<string, { rgb: string; color: string }> = {
    primary: { rgb: "var(--primary-rgb)", color: "var(--primary)" },
    tertiary: { rgb: "var(--tertiary-rgb)", color: "var(--tertiary)" },
    secondary: { rgb: "var(--secondary-rgb)", color: "var(--secondary)" },
    emerald: { rgb: "16, 185, 129", color: "#10b981" }
  };

  return (
    <section className="section" id="integrators" style={{ scrollMarginTop: 120 }}>
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>{t("integratorsEyebrow")}</span>
        </div>
        <h2>
          {t("integratorsHeading")} <span className="gradient-text">{t("integratorsHeadingAccent")}</span>
        </h2>
        <p>{t("integratorsDescription")}</p>
      </Reveal>

      <Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14
          }}
        >
          {integratorRoles.map((r) => {
            const tone = tones[r.tone];
            return (
              <div
                key={r.title}
                className="feature-card"
                style={{
                  padding: 20,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--panel)"
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: `rgba(${tone.rgb}, 0.12)`,
                    color: tone.color,
                    border: `1px solid rgba(${tone.rgb}, 0.30)`,
                    marginBottom: 12
                  }}
                >
                  <Icon name={r.icon} size={18} stroke={1.8} />
                </div>
                <h4
                  style={{
                    margin: "0 0 6px",
                    fontSize: 15,
                    fontWeight: 500,
                    color: "var(--text)"
                  }}
                >
                  {r.title}
                </h4>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-2)",
                    fontSize: 13.5,
                    lineHeight: 1.55
                  }}
                >
                  {r.desc}
                </p>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

function ForWhom() {
  const t = useTranslations("ecosystem");
  const audiences = getAudiences(t);
  return (
    <section className="section" id="audiences" style={{ scrollMarginTop: 120 }}>
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>{t("audiencesEyebrow")}</span>
        </div>
        <h2>
          {t("audiencesHeading")} <span className="gradient-text">{t("audiencesHeadingAccent")}</span>
        </h2>
        <p>{t("audiencesDescription")}</p>
      </Reveal>

      <Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16
          }}
        >
          {audiences.map((a, idx) => {
            const tones = [
              { rgb: "var(--primary-rgb)", color: "var(--primary)" },
              { rgb: "var(--tertiary-rgb)", color: "var(--tertiary)" },
              { rgb: "var(--secondary-rgb)", color: "var(--secondary)" },
              { rgb: "16, 185, 129", color: "#10b981" }
            ];
            const tone = tones[idx % tones.length];
            return (
              <div
                key={a.title}
                className="feature-card"
                style={{
                  padding: 22,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--panel)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      background: `rgba(${tone.rgb}, 0.12)`,
                      color: tone.color,
                      border: `1px solid rgba(${tone.rgb}, 0.30)`,
                      flexShrink: 0
                    }}
                  >
                    <Icon name={a.icon} size={20} stroke={1.8} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{a.title}</h4>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-2)",
                        fontFamily: "IBM Plex Mono, monospace",
                        letterSpacing: "0.04em"
                      }}
                    >
                      {a.sub}
                    </div>
                  </div>
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    color: "var(--text-2)",
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    display: "grid",
                    gap: 8
                  }}
                >
                  {a.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

function LongTermVision() {
  const t = useTranslations("ecosystem");
  const { registryName } = usePublicBranding();
  const federationPrinciples = getFederationPrinciples(t);
  return (
    <section className="section" id="federation" style={{ scrollMarginTop: 120 }}>
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>{t("federationEyebrow")}</span>
        </div>
        <h2>
          {t("federationHeading")} <span className="gradient-text">{t("federationHeadingAccent")}</span>
        </h2>
        <p>{t("federationDescription")}</p>
      </Reveal>

      <Reveal>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            flexWrap: "wrap",
            padding: "26px 18px",
            borderRadius: 16,
            border: "1px solid var(--border-strong)",
            background:
              "radial-gradient(420px 240px at 50% 0%, rgba(var(--primary-rgb),0.10), transparent 60%), var(--panel)",
            marginBottom: 22
          }}
        >
          <div style={{ textAlign: "center", minWidth: 180 }}>
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 14,
                color: "var(--text)",
                marginBottom: 4
              }}
            >
              air://air.mu
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>{registryName}</div>
          </div>

          <div
            style={{
              flex: "1 1 200px",
              maxWidth: 320,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8
            }}
          >
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-2)"
              }}
            >
              {t("federationBilateral")}
            </div>
            <div
              style={{
                width: "100%",
                height: 2,
                borderRadius: 2,
                background:
                  "linear-gradient(90deg, rgba(var(--primary-rgb),0.6), rgba(var(--tertiary-rgb),0.6))"
              }}
            />
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-2)"
              }}
            >
              {t("federationSovereigntyLabel")}
            </div>
          </div>

          <div style={{ textAlign: "center", minWidth: 180 }}>
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 14,
                color: "var(--text)",
                marginBottom: 4,
                display: "inline-flex",
                alignItems: "baseline",
                gap: 0
              }}
            >
              <span>air://air.</span>
              <span
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "rgba(var(--tertiary-rgb), 0.18)",
                  border: "1px solid rgba(var(--tertiary-rgb), 0.35)",
                  color: "var(--tertiary)",
                  letterSpacing: "0.04em",
                  marginLeft: 4
                }}
              >
                peer
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>{t("federationPeerRegistry")}</div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14
          }}
        >
          {federationPrinciples.map((fp) => (
            <div
              key={fp.label}
              className="feature-card"
              style={{
                padding: 18,
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--panel)"
              }}
            >
              <div
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-2)",
                  marginBottom: 8
                }}
              >
                {fp.label}
              </div>
              <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500 }}>{fp.title}</h4>
              <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13.5, lineHeight: 1.55 }}>
                {fp.desc}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function GetInvolved() {
  const t = useTranslations("ecosystem");
  const { operatorName, portalDomain, openSourceRepoUrl } = usePublicBranding();
  const baseTracks = getTracks(t);
  const tracks = [
    { ...baseTracks[0]!, href: openSourceRepoUrl },
    { ...baseTracks[1]!, href: `${openSourceRepoUrl.replace(/\/$/, "")}/pulls` },
    baseTracks[2]!,
    { ...baseTracks[3]!, desc: t("track4Desc", { portalDomain }) }
  ];
  return (
    <section className="section" id="engage" style={{ scrollMarginTop: 120 }}>
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>{t("engageEyebrow")}</span>
        </div>
        <h2>
          {t("engageHeading")} <span className="gradient-text">{t("engageHeadingAccent")}</span>
        </h2>
        <p>
          {t.rich("engageDescription", {
            operatorName,
            em: (chunks) => <em>{chunks}</em>
          })}
        </p>
      </Reveal>

      <Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16
          }}
        >
          {tracks.map((track) => {
            const hasHref = Boolean(track.href);
            const isExternal = hasHref && track.href!.startsWith("http");
            const LinkEl: React.ElementType = hasHref ? (isExternal ? "a" : Link) : "div";
            return (
              <LinkEl
                key={track.num}
                {...(hasHref ? { href: track.href } : {})}
                {...(isExternal
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="feature-card"
                style={{
                  position: "relative",
                  padding: 22,
                  borderRadius: 14,
                  border: track.featured
                    ? "1px solid rgba(var(--primary-rgb), 0.40)"
                    : "1px solid var(--border)",
                  background: track.featured
                    ? "linear-gradient(160deg, rgba(var(--primary-rgb), 0.10), var(--panel))"
                    : "var(--panel)",
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                  transition: "transform 220ms cubic-bezier(.2,.8,.2,1), border-color 220ms"
                }}
              >
                <div
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: track.featured ? "var(--primary)" : "var(--text-2)",
                    marginBottom: 10
                  }}
                >
                  {track.num}
                </div>
                <h4
                  style={{
                    margin: "0 0 8px",
                    fontSize: 18,
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    ...(track.featured
                      ? {
                          background: "var(--grad-text)",
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          color: "transparent"
                        }
                      : { color: "var(--text)" })
                  }}
                >
                  {track.title}
                </h4>
                <p
                  style={{
                    margin: "0 0 14px",
                    color: "var(--text-2)",
                    fontSize: 13.5,
                    lineHeight: 1.55
                  }}
                >
                  {track.desc}
                </p>
                {track.cta ? (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: track.featured ? "var(--primary)" : "var(--text)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    {track.cta}
                    <span aria-hidden>&rarr;</span>
                  </div>
                ) : null}
              </LinkEl>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

function ClosingCta() {
  const t = useTranslations("ecosystem");
  return (
    <section className="section">
      <Reveal>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "48px 32px",
            borderRadius: 20,
            border: "1px solid var(--border-strong)",
            background:
              "radial-gradient(600px 320px at 50% 0%, rgba(var(--primary-rgb),0.18), transparent 60%), radial-gradient(600px 320px at 100% 100%, rgba(var(--tertiary-rgb),0.14), transparent 60%), var(--panel)",
            textAlign: "center"
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.2
            }}
          >
            {t("ctaHeadingPrefix")}{" "}
            <span className="gradient-text">{t("ctaHeadingAccent")}</span>
            <br />
            {t("ctaHeadingSuffix")}
          </h2>
          <p
            style={{
              maxWidth: 580,
              margin: "16px auto 28px",
              color: "var(--text-2)",
              fontSize: 15,
              lineHeight: 1.55
            }}
          >
            {t("ctaDescription")}
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center"
            }}
          >
            <Link
              href="/contact"
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 10,
                background: "var(--grad-accent)",
                color: "#fff",
                fontWeight: 500,
                fontSize: 14,
                textDecoration: "none",
                border: "1px solid rgba(var(--primary-rgb), 0.40)"
              }}
            >
              {t("ctaButton")}
              <span aria-hidden>&rarr;</span>
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ============================================================
// Page
// ============================================================

export function EcosystemContent() {
  const t = useTranslations("ecosystem");
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

      <AnchorNav />

      <ThePlatform />
      <WhoRunsIt />
      <Integrators />
      <ForWhom />
      <LongTermVision />
      <GetInvolved />

      <ClosingCta />
    </div>
  );
}
