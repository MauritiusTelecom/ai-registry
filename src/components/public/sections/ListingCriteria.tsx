import {
  PageSection,
  Reveal,
  FeatureCard,
  Gradient,
  type IconName,
  type Tone
} from "@/components/library";

// "Listing criteria" — the sovereignty test. Left panel explains how it
// works and the quality-over-quantity stance; right panel is a 2x2 grid of
// the four sovereignty bases. Mirrors the #sovereignty section in
// uploads/AI_Registry_Decision_Makers_Guide.html.

const BASES: { icon: IconName; title: string; desc: string; tone: Tone }[] = [
  {
    icon: "flag",
    title: "Local law",
    desc: "Encodes local legislation, regulation, official process or professional obligation.",
    tone: "primary"
  },
  {
    icon: "database",
    title: "Local data",
    desc: "Uses local datasets, records or locally collected knowledge.",
    tone: "tertiary"
  },
  {
    icon: "lock",
    title: "Local systems",
    desc: "Integrates with or describes local institutional systems and workflows.",
    tone: "secondary"
  },
  {
    icon: "globe",
    title: "Local language & culture",
    desc: "Supports local language, culture, norms or context.",
    tone: "emerald"
  }
];

export function ListingCriteria() {
  return (
    <PageSection
      eyebrow="Listing criteria"
      title={
        <>
          The <Gradient>sovereignty test.</Gradient>
        </>
      }
      subtitle={
        <>
          Only resources that meet a sovereignty test are listed past basic discovery.
          The test asks whether the resource encodes local law, local data, local
          systems, or local language and culture - keeping &ldquo;sovereign&rdquo;
          specific, not aspirational.
        </>
      }
    >
      <Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
            gap: 22
          }}
          className="listing-criteria-grid"
        >
          {/* Left: bespoke "How it works" explainer panel - heavier border,
              radial-gradient background, an inline amber quality-over-quantity
              callout. Kept inline because it's a one-off layout. */}
          <div
            style={{
              padding: 28,
              borderRadius: 18,
              border: "1px solid var(--border-strong)",
              background:
                "radial-gradient(300px 200px at 0% 0%, rgba(var(--primary-rgb),0.12), transparent 60%), var(--panel)"
            }}
          >
            <h3
              style={{
                fontSize: 22,
                fontWeight: 500,
                margin: "0 0 8px",
                letterSpacing: "-0.015em"
              }}
            >
              How it works
            </h3>
            <p
              style={{
                color: "var(--text-2)",
                margin: "0 0 16px",
                fontSize: 14.5,
                lineHeight: 1.6
              }}
            >
              A submission must cite at least one sovereignty basis and provide{" "}
              <span
                style={{
                  background:
                    "linear-gradient(13deg, rgba(var(--primary-rgb),0.22), rgba(var(--tertiary-rgb),0.22))",
                  color: "var(--text)",
                  padding: "1px 7px",
                  borderRadius: 5,
                  fontWeight: 500
                }}
              >
                concrete evidence
              </span>
              : a referenced law, dataset, institution, language asset or cultural
              artefact. Reviewers apply a published checklist before elevating a
              resource&rsquo;s status.
            </p>
            <div
              style={{
                marginTop: 18,
                padding: "14px 16px",
                borderRadius: 10,
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.30)",
                color: "var(--text-2)",
                fontSize: 13,
                lineHeight: 1.55
              }}
            >
              <strong style={{ color: "#f59e0b", fontWeight: 500 }}>
                Quality over quantity.
              </strong>{" "}
              A registry of 50 credible resources is more useful than one of 1,000
              generic listings. Small, deliberate, trustworthy - that&rsquo;s the bar.
            </div>
          </div>

          {/* Right: 2x2 grid of sovereignty bases - clean FeatureCard fit. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14
            }}
            className="listing-criteria-bases"
          >
            {BASES.map((b) => (
              <FeatureCard
                key={b.title}
                icon={b.icon}
                tone={b.tone}
                title={b.title}
                body={b.desc}
                padding={18}
              />
            ))}
          </div>
        </div>
      </Reveal>
    </PageSection>
  );
}
