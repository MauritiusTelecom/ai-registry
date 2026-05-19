import { Reveal } from "../Reveal";

// "How it works" — six steps from submission to use. Step 5 is highlighted
// to make the point that the actual *use* of a resource happens directly
// between consumer and provider; the registry is never on the runtime path.
// Mirrors the #how section in
// uploads/AI_Registry_Decision_Makers_Guide.html.

// Pink → purple palette for the highlighted step. The 3-stop gradient is
// applied to the step number bubble (as background) and the step title
// text (as gradient text). Border, soft background tint, glow and the
// "Off-registry" label use alpha variants of the primary pink.
const HI_PRIMARY = "rgb(236, 72, 153)"; // pink
const HI_PRIMARY_RGB = "236, 72, 153";
const HI_SECONDARY = "rgb(244, 114, 182)"; // light pink
const HI_TERTIARY = "rgb(168, 85, 247)"; // purple
const HI_GRADIENT = `linear-gradient(13deg, ${HI_PRIMARY} 0%, ${HI_SECONDARY} 50%, ${HI_TERTIARY} 100%)`;

const STEPS: { num: number; title: string; desc: string; highlight?: boolean }[] = [
  {
    num: 1,
    title: "Submit",
    desc: "Provider submits the resource with metadata and sovereignty evidence."
  },
  {
    num: 2,
    title: "Review",
    desc: "Reviewer applies the sovereignty rubric and records reviewer notes."
  },
  {
    num: 3,
    title: "Publish",
    desc: "Operator publishes the listing and issues the stable AIR-ID."
  },
  {
    num: 4,
    title: "Discover",
    desc: "Consumer finds the resource through the portal or discovery API."
  },
  {
    num: 5,
    title: "Use",
    desc: "Consumer calls the provider directly - runtime never touches the registry.",
    highlight: true
  },
  {
    num: 6,
    title: "Maintain",
    desc: "Provider keeps metadata accurate; status reflects any changes over time."
  }
];

export function HowItWorks() {
  return (
    <section className="section">
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>How it works</span>
        </div>
        <h2>
          From submission to use,{" "}
          <span className="gradient-text">in six steps.</span>
        </h2>
      </Reveal>

      <Reveal>
        <div className="how-steps">
          {STEPS.map((s) => {
            const isHi = !!s.highlight;
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
                    Off-registry
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
