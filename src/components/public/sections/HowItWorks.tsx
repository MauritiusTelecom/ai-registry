import { PageSection, Reveal, Gradient } from "@/components/library";

type Step = {
  num: number;
  title: string;
  description: string;
  highlight?: boolean;
};

const STEPS: Step[] = [
  {
    num: 1,
    title: "Submit",
    description: "Provider submits the resource with metadata and sovereignty evidence."
  },
  {
    num: 2,
    title: "Review",
    description: "Reviewer applies the sovereignty rubric and records reviewer notes."
  },
  {
    num: 3,
    title: "Publish",
    description: "Operator publishes the listing and issues the stable AIR-ID."
  },
  {
    num: 4,
    title: "Discover",
    description: "Consumer finds the resource through the portal or discovery API."
  },
  {
    num: 5,
    title: "Use",
    description:
      "Consumer calls the provider directly - runtime never touches the registry.",
    highlight: true
  },
  {
    num: 6,
    title: "Maintain",
    description: "Provider keeps metadata accurate; status reflects any changes over time."
  }
];

const HI_GRADIENT =
  "linear-gradient(13deg, rgb(236, 72, 153) 0%, rgb(244, 114, 182) 50%, rgb(168, 85, 247) 100%)";

function StepCard({ step, index }: { step: Step; index: number }) {
  const hi = !!step.highlight;
  return (
    <Reveal delay={80 + index * 40}>
      <article
        className={`how-step feature-card${hi ? " how-step--hi" : ""}`}
        style={{
          position: "relative",
          padding: "22px 18px",
          borderRadius: 14,
          border: hi
            ? "1px solid rgba(236, 72, 153, 0.45)"
            : "1px solid var(--border)",
          background: hi
            ? "linear-gradient(160deg, rgba(236, 72, 153, 0.12), var(--panel))"
            : "var(--panel)"
        }}
      >
        {hi ? (
          <span
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgb(236, 72, 153)"
            }}
          >
            Off-registry
          </span>
        ) : null}
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 14,
            background: hi ? HI_GRADIENT : "rgba(var(--primary-rgb), 0.12)",
            color: hi ? "#fff" : "var(--primary)",
            border: hi ? "none" : "1px solid rgba(var(--primary-rgb), 0.35)"
          }}
        >
          {step.num}
        </span>
        <h4
          style={{
            margin: "0 0 8px",
            fontSize: 16,
            fontWeight: 500,
            ...(hi
              ? {
                  background: HI_GRADIENT,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent"
                }
              : { color: "var(--text)" })
          }}
        >
          {step.title}
        </h4>
        <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13.5, lineHeight: 1.55 }}>
          {step.description}
        </p>
      </article>
    </Reveal>
  );
}

export function HowItWorks() {
  return (
    <PageSection
      eyebrow="How it works"
      title={
        <>
          From submission to use, <Gradient>in six steps.</Gradient>
        </>
      }
    >
      <section className="how-steps" aria-label="Registry lifecycle">
        {STEPS.map((step, index) => (
          <StepCard key={step.num} step={step} index={index} />
        ))}
      </section>
    </PageSection>
  );
}
