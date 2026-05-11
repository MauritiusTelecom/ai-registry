import { Icon, type IconName } from "../Icon";
import { Reveal } from "../Reveal";

// "What gets listed" — four resource types listed on the registry.
// Renders as a 4-column grid of feature cards that collapse to 2-up and
// 1-up on smaller viewports. Mirrors the cards in
// uploads/AI_Registry_Decision_Makers_Guide.html (#features section).

type Tone = "primary" | "tertiary" | "secondary" | "emerald";

const TYPES: {
  icon: IconName;
  eyebrow: string;
  title: string;
  desc: string;
  sample: string;
  tone: Tone;
}[] = [
  {
    icon: "doc",
    eyebrow: "Type · Model",
    title: "Model",
    desc: "Language, vision or domain models trained on or aware of local context, language and norms.",
    sample: "model/mu-llm/kreol-1",
    tone: "primary"
  },
  {
    icon: "agent",
    eyebrow: "Type · Agent",
    title: "Agent",
    desc: "Autonomous workflows that act on local processes - registrations, filings, public-service navigation.",
    sample: "agent/mu-agent/service-finder",
    tone: "tertiary"
  },
  {
    icon: "settings",
    eyebrow: "Type · Tool",
    title: "Tool",
    desc: "Callable APIs, calculators and functions that AI systems can compose programmatically.",
    sample: "tool/mu-tool/tax-calculator",
    tone: "secondary"
  },
  {
    icon: "shield",
    eyebrow: "Type · Skill",
    title: "Skill",
    desc: "Packaged expertise - tax, legal, accounting workflows - ready to plug into agents.",
    sample: "skill/mu-skill/fiscaliste-mu",
    tone: "emerald"
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
  secondary: {
    rgb: "var(--secondary-rgb)",
    color: "var(--secondary)",
    iconBg:
      "linear-gradient(13deg, rgba(var(--secondary-rgb),0.25), rgba(var(--primary-rgb),0.15))",
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

export function WhatGetsListed() {
  return (
    <section className="section">
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>What gets listed</span>
        </div>
        <h2>
          Four resource types.{" "}
          <span className="gradient-text">Composable by AI.</span>
        </h2>
        <p>
          The registry covers four kinds of sovereign AI resource - models, agents, tools
          and skills. Each has its own listing template and stable AIR-ID, so consumers
          and AI systems can find and combine them programmatically.
        </p>
      </Reveal>

      <Reveal>
        <div className="types-grid">
          {TYPES.map((t) => {
            const tone = TONE[t.tone];
            return (
              <div
                className="feature-card type-card"
                key={t.title}
                style={{
                  position: "relative",
                  padding: 26,
                  borderRadius: 18,
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                  overflow: "hidden",
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
                  <Icon name={t.icon} size={22} stroke={1.8} />
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
                  {t.eyebrow}
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
                  {t.title}
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
                  {t.desc}
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
                  {t.sample}
                </span>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
