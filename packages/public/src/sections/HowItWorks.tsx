import { listActiveHowItWorksSteps } from "@airegistry/core/services/public-cms";
import { getTranslations } from "next-intl/server";
import { Reveal } from "../shell/Reveal";

// "How it works" — steps from submission to use. The "Use" step is
// highlighted (in pink/purple) to make the point that the actual *use* of
// a resource happens directly between consumer and provider; the registry
// is never on the runtime path.

// Pink/purple palette for the highlighted step.
const HI_PRIMARY = "rgb(236, 72, 153)";
const HI_PRIMARY_RGB = "236, 72, 153";
const HI_SECONDARY = "rgb(244, 114, 182)";
const HI_TERTIARY = "rgb(168, 85, 247)";
const HI_GRADIENT = `linear-gradient(13deg, ${HI_PRIMARY} 0%, ${HI_SECONDARY} 50%, ${HI_TERTIARY} 100%)`;

type Step = { num: number; title: string; desc: string; highlight: boolean };

/** Defence-in-depth fallback if cms_how_it_works_step is empty / unreachable. */
function getFallbackSteps(t: (key: string) => string): Step[] {
  return [
    { num: 1, title: t("step1Title"), desc: t("step1Desc"), highlight: false },
    { num: 2, title: t("step2Title"), desc: t("step2Desc"), highlight: false },
    { num: 3, title: t("step3Title"), desc: t("step3Desc"), highlight: false },
    { num: 4, title: t("step4Title"), desc: t("step4Desc"), highlight: false },
    { num: 5, title: t("step5Title"), desc: t("step5Desc"), highlight: true },
    { num: 6, title: t("step6Title"), desc: t("step6Desc"), highlight: false }
  ];
}

export async function HowItWorks() {
  const t = await getTranslations("howItWorks");
  const fallbackSteps = getFallbackSteps(t);
  let steps: Step[];
  try {
    const rows = await listActiveHowItWorksSteps();
    steps = rows.length
      ? rows.map((r) => ({
          num: r.stepNumber,
          title: r.title,
          desc: r.description,
          highlight: r.highlight
        }))
      : fallbackSteps;
  } catch {
    steps = fallbackSteps;
  }

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
      </Reveal>

      <Reveal>
        <div className="how-steps">
          {steps.map((s) => {
            const isHi = s.highlight;
            return (
              <div
                key={s.num}
                className={`how-step feature-card${isHi ? " how-step--hi" : ""}`}
                style={{
                  position: "relative",
                  padding: "22px 18px",
                  borderRadius: 14,
                  border: `1px solid ${
                    isHi ? `rgba(${HI_PRIMARY_RGB}, 0.40)` : "var(--border)"
                  }`,
                  background: isHi
                    ? `linear-gradient(160deg, rgba(${HI_PRIMARY_RGB}, 0.10), var(--panel))`
                    : "var(--panel)",
                  transition:
                    "border-color 220ms, transform 220ms cubic-bezier(.2,.8,.2,1)"
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: isHi ? HI_GRADIENT : "var(--grad-text)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "IBM Plex Mono, monospace",
                    fontWeight: 600,
                    fontSize: 14,
                    marginBottom: 14,
                    boxShadow: isHi
                      ? `0 0 14px rgba(${HI_PRIMARY_RGB}, 0.55)`
                      : "0 0 14px rgba(var(--primary-rgb), 0.4)"
                  }}
                >
                  {s.num}
                </div>
                <h5
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    margin: "0 0 6px",
                    letterSpacing: "-0.01em",
                    ...(isHi
                      ? {
                          background: HI_GRADIENT,
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          color: "transparent"
                        }
                      : { color: "var(--text)" })
                  }}
                >
                  {s.title}
                </h5>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-2)",
                    margin: 0,
                    lineHeight: 1.55
                  }}
                >
                  {s.desc}
                </p>
                {isHi && (
                  <div
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: HI_PRIMARY,
                      marginTop: 10
                    }}
                  >
                    {t("offRegistry")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
