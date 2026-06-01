import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@airegistry/ui-kit";
import { Reveal } from "../shell/Reveal";

// "What gets listed" — three resource types listed on the registry.
// Renders as a 3-column grid of feature cards that collapse to 2-up and
// 1-up on smaller viewports. Mirrors the cards in
// uploads/AI_Registry_Decision_Makers_Guide.html (#features section).

type Tone = "primary" | "tertiary" | "emerald";

type ResourceKind = "model" | "agent" | "skill";

const TYPES: {
  icon: IconName;
  eyebrowKey: string;
  titleKey: string;
  descKey: string;
  sample: string;
  tone: Tone;
  kind: ResourceKind;
}[] = [
  {
    icon: "doc",
    eyebrowKey: "modelEyebrow",
    titleKey: "modelTitle",
    descKey: "modelDesc",
    sample: "model/mu-llm/kreol-1",
    tone: "primary",
    kind: "model"
  },
  {
    icon: "agent",
    eyebrowKey: "agentEyebrow",
    titleKey: "agentTitle",
    descKey: "agentDesc",
    sample: "agent/mu-agent/service-finder",
    tone: "tertiary",
    kind: "agent"
  },
  {
    icon: "shield",
    eyebrowKey: "skillEyebrow",
    titleKey: "skillTitle",
    descKey: "skillDesc",
    sample: "skill/mu-skill/fiscaliste-mu",
    tone: "emerald",
    kind: "skill"
  }
];

// Inline tone styles. Uses the same brand variables as the rest of the page
// (--primary, --tertiary, --secondary) plus an emerald accent matched to the
// reference HTML. Each tone tints the icon chip, glow, and the AIR-ID sample.
const TONE: Record<
  Tone,
  { rgb: string; color: string; iconBg: string; sampleColor: string }
> = {
  primary: {
    rgb: "var(--primary-rgb)",
    color: "var(--primary)",
    iconBg:
      "linear-gradient(13deg, rgba(var(--primary-rgb),0.22), rgba(var(--tertiary-rgb),0.22))",
    sampleColor: "var(--secondary)"
  },
  tertiary: {
    rgb: "var(--tertiary-rgb)",
    color: "var(--tertiary)",
    iconBg:
      "linear-gradient(13deg, rgba(var(--tertiary-rgb),0.25), rgba(var(--primary-rgb),0.15))",
    sampleColor: "var(--secondary)"
  },
  emerald: {
    rgb: "16, 185, 129",
    color: "#10b981",
    iconBg:
      "linear-gradient(13deg, rgba(16,185,129,0.25), rgba(var(--secondary-rgb),0.15))",
    sampleColor: "var(--secondary)"
  }
};

export async function WhatGetsListed() {
  const t = await getTranslations("whatGetsListed");
  return (
    <section className="section">
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>{t("eyebrow")}</span>
        </div>
        <h2>
          {t("heading")}{" "}
          <span className="gradient-text">{t("headingAccent")}</span>
        </h2>
        <p>{t("description")}</p>
      </Reveal>

      <Reveal>
        <div className="types-grid">
          {TYPES.map((typ) => {
            const tone = TONE[typ.tone];
            return (
              <Link
                href={`/registry?kind=${typ.kind}`}
                className="feature-card type-card"
                key={typ.titleKey}
                style={{
                  position: "relative",
                  padding: 26,
                  borderRadius: 18,
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                  overflow: "hidden",
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                  transition:
                    "transform 220ms cubic-bezier(.2,.8,.2,1), border-color 220ms"
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: "-40% -30% auto auto",
                    width: 240,
                    height: 240,
                    pointerEvents: "none",
                    opacity: 0.7,
                    background: `radial-gradient(circle at center, rgba(${tone.rgb}, 0.22), transparent 60%)`
                  }}
                />
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background: tone.iconBg,
                    border: "1px solid var(--border-strong)",
                    color: "var(--text)",
                    marginBottom: 18,
                    position: "relative",
                    zIndex: 1
                  }}
                >
                  <Icon name={typ.icon} size={22} stroke={1.8} />
                </div>
                <div
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 10.5,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--text-3)",
                    marginBottom: 4,
                    position: "relative",
                    zIndex: 1
                  }}
                >
                  {t(typ.eyebrowKey as any)}
                </div>
                <h4
                  style={{
                    fontSize: 20,
                    margin: "0 0 8px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    position: "relative",
                    zIndex: 1,
                    color: "var(--text)"
                  }}
                >
                  {t(typ.titleKey as any)}
                </h4>
                <p
                  style={{
                    color: "var(--text-2)",
                    margin: "0 0 16px",
                    fontSize: 14,
                    lineHeight: 1.6,
                    position: "relative",
                    zIndex: 1
                  }}
                >
                  {t(typ.descKey as any)}
                </p>
                <span
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 11,
                    padding: "8px 11px",
                    borderRadius: 8,
                    background: "var(--code-bg)",
                    border: "1px solid var(--border)",
                    color: tone.sampleColor,
                    display: "inline-flex",
                    position: "relative",
                    zIndex: 1
                  }}
                >
                  {typ.sample}
                </span>
              </Link>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
