import {
  PageSection,
  Reveal,
  FeatureCard,
  Gradient,
  type IconName,
  type Tone
} from "@/components/library";

const BASES: { icon: IconName; title: string; description: string; tone: Tone }[] = [
  {
    icon: "flag",
    title: "Local law",
    description:
      "Encodes local legislation, regulation, official process or professional obligation.",
    tone: "primary"
  },
  {
    icon: "database",
    title: "Local data",
    description: "Uses local datasets, records or locally collected knowledge.",
    tone: "tertiary"
  },
  {
    icon: "lock",
    title: "Local systems",
    description: "Integrates with or describes local institutional systems and workflows.",
    tone: "secondary"
  },
  {
    icon: "globe",
    title: "Local language & culture",
    description: "Supports local language, culture, norms or context.",
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
      subtitle='Only resources that meet a sovereignty test are listed past basic discovery. The test asks whether the resource encodes local law, local data, local systems, or local language and culture - keeping "sovereign" specific, not aspirational.'
    >
      <Reveal delay={70}>
        <section
          className="listing-criteria-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 20,
            alignItems: "start"
          }}
        >
          <Reveal delay={90}>
            <article
              style={{
                padding: 28,
                borderRadius: 16,
                border: "1px solid var(--border)",
                background: "var(--panel)"
              }}
            >
              <h3 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 500 }}>How it works</h3>
              <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14, lineHeight: 1.6 }}>
                A submission must cite at least one sovereignty basis and provide concrete evidence: a
                referenced law, dataset, institution, language asset or cultural artefact. Reviewers
                apply a published checklist before elevating a resource&apos;s status.
              </p>
              <p
                style={{
                  marginTop: 20,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(var(--primary-rgb), 0.35)",
                  background: "rgba(var(--primary-rgb), 0.08)",
                  color: "var(--text-2)",
                  fontSize: 13.5,
                  lineHeight: 1.55
                }}
              >
                Quality over quantity. A registry of 50 credible resources is more useful than one of
                1,000 generic listings. Small, deliberate, trustworthy - that&apos;s the bar.
              </p>
            </article>
          </Reveal>

          <section
            className="listing-criteria-bases"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14
            }}
          >
            {BASES.map((basis, index) => (
              <Reveal key={basis.title} delay={100 + index * 40}>
                <FeatureCard
                  icon={basis.icon}
                  tone={basis.tone}
                  title={basis.title}
                  body={basis.description}
                />
              </Reveal>
            ))}
          </section>
        </section>
      </Reveal>
    </PageSection>
  );
}
